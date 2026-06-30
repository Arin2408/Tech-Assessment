# DECISIONS.md

Short and honest. This is the document I'd interview from.

---

## 1. Key decisions & tradeoffs

### RTK Query vs thunks → **thunks + `createEntityAdapter`**

I used `createAsyncThunk` + `createEntityAdapter`, not RTK Query.

- The hard part of this exercise is **merging three sources into one entity
  table**: paginated REST, a live WebSocket feed, and an IndexedDB cache. RTK
  Query owns its own normalized cache keyed by query args; reconciling live
  socket events and cache hydration into that cache means a lot of
  `updateQueryData` plumbing that fights the abstraction. An entity adapter is a
  single, inspectable source of truth that all three writers update directly.
- I keep **all loaded tasks** in the adapter (accumulated across pages + tasks
  discovered via events), and derive every view with memoized selectors.
- Tradeoff: I give up RTKQ's automatic caching/refetching/dedupe. For a
  single-list app with bespoke merge rules that's a good trade. If this grew
  many endpoints with standard fetch semantics, RTKQ would start to pay off.

### Pagination: server paginates, **filtering/sorting is client-side**

The mock paginates server-side (`page`/`pageSize`) but **ignores** the `type`
and `status` query params it advertises. So server-side filtering isn't
actually available. My model:

- "Load more" fetches the next **server page** and merges it into the store.
- **Filter / search / sort run client-side** over all loaded tasks via memoized
  selectors (`selectFilteredTasks → selectSortedTasks → selectPagedTasks`).
- UI pagination is a **client-side slice** over the filtered result.

Tradeoff: filters only see what's been loaded. I made that honest in the UI
(`N loaded / TOTAL`, a "Load more" button). With a real API that filtered
server-side, I'd push filter/sort params to the server and treat the store as a
window, not an accumulator.

### Typing the messy data → **discriminated union + normalized enum + a trust boundary**

- `Task` is a **discriminated union on `type`** (`image | audio | text |
  unknown`). The `unknown` variant carries `rawType` so the original value
  (e.g. `"video"`) is preserved, not lost.
- `status` is a **normalized enum** (`TaskStatus`). `"in_progress"` and
  `"InProgress"` both collapse to `InProgress`; unrecognized values become
  `Unknown` and keep `rawStatus` so the UI can still show the original.
- All coercion lives in **one file, `normalize.ts`**, which is the only place
  that accepts `unknown` and narrows. Nothing downstream sees raw shapes. There
  is no `any` anywhere in the codebase (strict mode + `noUnusedLocals` +
  `noUncheckedIndexedAccess` are on; `npm run typecheck` is clean).

### Real-time merge strategy

`useTaskFeed` subscribes to the WS, parses each frame through `parseFeedEvent`
(same `unknown`→narrow discipline), and dispatches `applyFeedEvent`. The reducer:

- **`task.updated`**: patch status/updatedAt **only if the event is not older**
  than what we have (`ev.updatedAt >= existing.updatedAt`) — guards against
  out-of-order delivery regressing state.
- **`task.assigned`**: patch the assignee.
- **`annotation.created`**: increment `annotationCount` and bump `updatedAt`.
- **Unloaded task** (the feed deliberately emits ids like `t123` beyond the
  loaded page): I create a **`partial: true` stub** with whatever the event
  carried, rather than dropping it. It's visibly flagged "partial" in the list
  and detail panel. When a later page fetch brings the full record, it replaces
  the stub (and the merge keeps the newer `updatedAt`, so a live event can't be
  clobbered by a stale page). Reconnect uses **capped exponential backoff**;
  teardown nulls the handlers and closes the socket so there are no leaks or
  duplicate subscriptions in React 18 StrictMode.

---

## 2. Streamed markdown — how it's rendered safely

**Pipeline:** `raw markdown → marked (→ HTML string) → DOMPurify → safe HTML →
dangerouslySetInnerHTML`.

- The single trust boundary is **`src/components/Markdown.tsx`**. It is the only
  place untrusted content becomes DOM, and nothing reaches the DOM without
  passing through `DOMPurify.sanitize` first.
- DOMPurify removes executable nodes and strips all `on*` handler attributes, so
  the stream's `<script>alert('xss-script')</script>` is dropped entirely and
  `<img src=x onerror="alert('xss-img')">` loses its `onerror`. As
  defense-in-depth I also explicitly `FORBID_TAGS: [script, style, iframe,
  object, embed]` and `FORBID_ATTR: [onerror, onload, onclick]`, and pin the
  HTML profile.
- Sanitization runs **client-side only**: on the server pass (no DOM) the
  component emits an empty string, so there is zero chance of shipping
  unsanitized HTML in SSR output. The summary is only ever fetched client-side
  anyway.
- This is **covered by tests** (`Markdown.test.tsx`): the script tag and the
  `onerror` attribute are asserted absent after rendering the real payloads.

**Streaming + lifecycle:** I deliberately **do not use `EventSource`**. It
auto-reconnects when the server ends the stream (which this mock does on
completion) → an infinite re-request loop, and it can't be aborted. Instead
`useTaskSummary` uses `fetch` + `ReadableStream` + an **`AbortController`**:

- Chunks are appended and rendered **incrementally** as they arrive (the user
  sees it build up), not only at the end.
- Switching tasks mid-stream **aborts** the in-flight request before starting
  the new one (the effect cleanup calls `controller.abort()`).
- A stream error sets `status: "error"` and surfaces it; an abort stays silent.
- SSE framing is parsed by a **pure, unit-tested** parser (`src/lib/sse.ts`)
  that buffers partial frames across chunk boundaries and decodes the
  JSON-encoded chunk strings / the `event: done` terminator.

---

## 3. IndexedDB caching

- **What I cache:** the normalized, non-partial task list + `total` +
  `loadedPages` + a `cachedAt` timestamp, under one key via **localforage**
  (IndexedDB, off the main thread).
- **When I revalidate:** on mount, `useTasksBootstrap` reads the cache and
  hydrates the store **immediately** (flagged `fromCache`), then **always**
  fetches page 1 from the server. A successful fetch clears the cache flag.
- **How I avoid stale-data bugs:**
  - The UI shows a visible **"Showing cached data from <time>. Revalidating…"**
    banner until fresh data replaces it — the user is never misled.
  - Writes are **debounced (800ms)** and async so large writes never block
    rendering.
  - **Partial stubs are excluded** from the cache (incomplete data shouldn't be
    persisted and resurrected as if real).
  - Cache reads/writes are **best-effort**: any failure (quota, private mode)
    is swallowed so caching can never break the app.

---

## 4. Messy / edge data — handled vs deliberately not

**Handled (in `normalize.ts`, documented per-field):**

- `status` inconsistent casing/spelling → enum; unrecognized → `Unknown` +
  `rawStatus` kept.
- `type` unknown (`"video"`) → `unknown` variant + `rawType` kept.
- `annotationCount` number **or** numeric string → number (clamped to a
  non-negative integer); garbage → `0`.
- `updatedAt` epoch-ms **or** ISO string → epoch ms; unparseable → `0` (sorts to
  the bottom, stays visible).
- `assignee` `{id,name}` or `null`, malformed object → `null` (unassigned is a
  real state).
- `meta` free-form → `Record<string, unknown>` (kept, not typed away).
- Out-of-order live events, events for unloaded tasks, slow server responses
  (the mock's 1200ms pages → loading skeletons), the assign 404 (rollback).
- The **one** case I drop: a record with **no `id`** — an entity with no
  identity can't live in an adapter. I count these and surface "N skipped" in
  the header rather than hiding it.

**Deliberately not (scope):**

- I don't deeply validate/normalize `meta` beyond "is it an object" — it's
  free-form by design and nothing depends on its shape.
- No schema/runtime validator (zod) — the normalizer is hand-written and tested;
  a validator would be the next step if payloads grew.
- Client-side filters only see loaded pages (see §1) — a conscious trade given
  the mock can't filter server-side.

---

## 5. Part 2: Bug hunt — `src/buggy/TaskTicker.tsx`

Fixes are annotated inline; root causes:

1. **Stale closure in the clock.** `setInterval(() => setTick(tick + 1))` with
   `[]` deps captured `tick = 0` forever, so it set `1` repeatedly and the clock
   never advanced. **Fix:** functional update `setTick(t => t + 1)`, which always
   reads the latest value.
2. **State mutation / same reference.** `setTasks(prev => { prev.push(t); return
   prev; })` mutated the existing array and returned the **same reference**, so
   React bailed out of re-rendering, and it accumulated duplicates. **Fix:**
   return a **new** array and de-dupe by id (`prev.some(...) ? prev : [...prev,
   t]`).
3. **Mutating state during render.** `const sorted = tasks.sort(...)` sorts the
   state array **in place** — a render side effect that mutates Redux/React
   state and can corrupt order. **Fix:** copy first: `[...tasks].sort(...)`.
4. **Fetching on a null selection.** The effect ran on mount with `selectedId =
   null` and fetched `/api/tasks/null` (a 404), pushing junk into state. **Fix:**
   guard `if (!selectedId) return;` (verified by a test that asserts no fetch on
   mount).
5. **Request race / no cancellation.** Rapid selection changes could resolve out
   of order, so an older response could overwrite a newer one. **Fix:**
   `AbortController` + an `ignore` flag in cleanup so only the latest response is
   applied.
6. **Swallowed errors.** A failed/404 fetch was silently ignored. **Fix:** throw
   on non-ok, ignore intentional aborts, log real failures (the brief says "show
   failures, don't hide them").
7. **Array index as React key.** `key={i}` on a list that **re-sorts** makes
   React reuse the wrong DOM/component state when order changes. **Fix:** stable
   `key={t.id}`.

(That's 7 distinct defects; the brief planted "at least four.")

---

## 6. What I'd do next with more time

- Push filter/sort to a real server API and treat the store as a windowed view
  instead of accumulating all pages.
- Virtualize the list (react-window) for the full 137+ rows and beyond.
- `redux-persist` for filter/UI state across reloads.
- Cache streamed summaries in IndexedDB (revisited task shows instantly).
- A real auth/identity for "assign to me" and a genuine write endpoint.
- Richer reconnect: resume/replay missed events with a server cursor.

---

## 7. AI usage & verification

I used an AI assistant to scaffold boilerplate (config files, repetitive
component markup, test skeletons) and to draft this document. I verified
everything by:

- `npm run typecheck` — clean under strict mode (no `any`).
- `npm test` — 37 tests across 7 suites, including the security (sanitization)
  and live-merge edge cases.
- `npm run build` — production build compiles + lints clean.
- Manual end-to-end smoke tests against the running mock: REST pagination, the
  single-task endpoint (incl. the unknown `video` type), the SSE summary stream
  (confirmed the untrusted `<script>`/`onerror` payloads arrive and are then
  stripped at render), the WebSocket feed (all three event kinds incl. the
  unloaded-`t123` case), and the PATCH 404 that drives the assign rollback.

Every non-obvious decision above is one I can defend and change live.
