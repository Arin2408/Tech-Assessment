# Annotation Activity Console

An internal console for annotation tasks. It takes deliberately messy backend
data and a live event stream, normalizes both into typed state, and renders a
correct, interactive UI — plus an AI summary streamed and sanitized on demand.

Built with **Next.js (App Router) + React 18 + TypeScript (strict)**, **Redux
Toolkit**, **Tailwind**, and tested with **Jest + React Testing Library**.

> Design decisions, tradeoffs, the bug-hunt write-up, and the security model
> live in **[DECISIONS.md](./DECISIONS.md)** — that is the document to read.

## Running it

You need two processes: the mock server and the Next app.

### 1. Start the mock server (port 4000)

```bash
cd mock-server
npm install
npm run mock
# -> mock on http://localhost:4000 (ws://localhost:4000/ws)
```

### 2. Start the app (port 3000)

In a second terminal, from the repo root:

```bash
npm install
npm run dev
# -> http://localhost:3000
```

Open http://localhost:3000.

> Convenience: from the repo root, `npm run mock` proxies to the mock server's
> script (after you've run `npm install` inside `mock-server/` once).

### Configuration

The app talks to `http://localhost:4000` by default. Override via env if needed:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:4000   # REST + SSE base
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws     # WebSocket URL
```

## Scripts

| Command            | What it does                                 |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start the Next dev server                    |
| `npm run build`    | Production build (also runs lint + types)    |
| `npm test`         | Run the Jest + RTL suite                     |
| `npm run typecheck`| `tsc --noEmit` (strict)                      |
| `npm run mock`     | Start the mock server (proxy)                |

## What to look at

- **Data path:** `src/lib/types.ts` (domain model), `src/lib/normalize.ts`
  (the trust boundary), `src/lib/feed.ts` (WS event parsing).
- **State:** `src/store/tasksSlice.ts` (entity adapter + thunks + live merge),
  `src/store/selectors.ts` (memoized derived views).
- **Real-time:** `src/hooks/useTaskFeed.ts` (WebSocket + reconnect).
- **Streamed summary:** `src/lib/sse.ts` (pure SSE parser),
  `src/hooks/useTaskSummary.ts` (fetch-stream + cancel),
  `src/components/Markdown.tsx` (**the single sanitization boundary**).
- **Persistence:** `src/lib/idb.ts` + `src/hooks/useTasksBootstrap.ts`.
- **Bug hunt:** `src/buggy/TaskTicker.tsx` (fixed, annotated).

## Tests

`npm test` runs 7 suites / 37 tests covering the normalizer, the SSE parser,
selectors (filter/sort/derived metric), the live-event merge reducer, markdown
sanitization (XSS payloads are stripped), the filter→rows RTL interaction, and
the TaskTicker null-guard fix.

## Theming

Light/dark mode toggle in the header (sun/moon). The choice persists to
`localStorage` and defaults to the OS preference; an inline script in the
document head applies the theme before first paint, so there's no flash of the
wrong theme on reload. Implemented with Tailwind's `class` dark mode
(`src/lib/theme.ts`, `src/components/ThemeToggle.tsx`).

## Notes / known scope

- The mock paginates server-side but **ignores** `type`/`status` query params,
  so filtering/sorting/searching is client-side over accumulated pages. See
  DECISIONS.md.
- "Assign to me" is optimistic with rollback; the mock has no write endpoint,
  so the PATCH 404s and you'll see the rollback + inline error — that is the
  intended demonstration of the rollback path, not a bug.
