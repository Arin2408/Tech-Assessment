"use client";

/**
 * TaskTicker.tsx — FIXED version of the Part 2 bug-hunt component.
 *
 * The original (see DECISIONS.md "Part 2: Bug hunt") compiled and rendered but
 * had several real defects. Each fix is annotated with the bug number that
 * DECISIONS.md explains in full.
 */

import { useEffect, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // (A) running clock for "x seconds ago".
  // BUG 1 FIX: functional update — `setTick(tick + 1)` captured a stale `tick`
  // from the first render (empty deps), so it was stuck at 1. `t => t + 1`
  // always reads the latest value.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // (B) refetch whenever selection changes.
  useEffect(() => {
    // BUG 4 FIX: guard the null selection. The original fired on mount with
    // selectedId === null and fetched `/api/tasks/null` (a 404), pushing junk.
    if (!selectedId) return;

    // BUG 5 FIX: cancel stale in-flight requests. Rapid selection changes could
    // resolve out of order; an AbortController + ignore flag keeps only the
    // latest response.
    const controller = new AbortController();
    let ignore = false;

    fetch(`${apiBase}/api/tasks/${selectedId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((t: Task) => {
        if (ignore) return;
        // BUG 2 FIX: never mutate state. The original did `prev.push(t); return
        // prev;` — same array reference, so React bailed out of re-rendering,
        // and it also accumulated duplicates. Return a NEW array and de-dupe.
        setTasks((prev) =>
          prev.some((x) => x.id === t.id) ? prev : [...prev, t],
        );
      })
      .catch((err) => {
        // BUG 6 FIX: errors were swallowed. Ignore intentional aborts; log real
        // failures instead of leaving the UI silently wrong.
        if (err?.name !== "AbortError") {
          console.error("TaskTicker fetch failed:", err);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedId, apiBase]);

  // (C) newest first.
  // BUG 3 FIX: `tasks.sort()` mutates the state array in place during render
  // (a React state mutation, and a render side effect). Copy before sorting.
  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <ul>
      {sorted.map((t) => (
        // BUG 7 FIX: use the stable `t.id` as key, not the array index. With a
        // re-sorting list, index keys make React reuse the wrong DOM/state.
        <li key={t.id} onClick={() => setSelectedId(t.id)}>
          {t.title} (updated {Math.floor((Date.now() - t.updatedAt) / 1000)}s ago)
        </li>
      ))}
    </ul>
  );
}

export type { Task };
