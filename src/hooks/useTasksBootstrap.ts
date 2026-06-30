"use client";

/**
 * useTasksBootstrap — the cache/revalidate lifecycle.
 *
 *  1. On mount, read the cached list from IndexedDB and hydrate the store so
 *     the UI paints immediately (flagged `fromCache`).
 *  2. Then fetch page 1 from the server to revalidate; success clears the
 *     cache flag.
 *  3. Persist the loaded list back to IndexedDB (debounced) whenever it
 *     changes, off the main thread, so reloads stay instant.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTasks, hydrateFromCache } from "@/store/tasksSlice";
import { readCachedTasks, writeCachedTasks } from "@/lib/idb";
import { selectAllTasks, selectLoadedPages, selectServerTotal } from "@/store/selectors";

const PERSIST_DEBOUNCE_MS = 800;

export function useTasksBootstrap(pageSize = 20): void {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasks);
  const total = useAppSelector(selectServerTotal);
  const loadedPages = useAppSelector(selectLoadedPages);
  const didInit = useRef(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 1 + 2: hydrate from cache, then revalidate.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    let cancelled = false;

    (async () => {
      const cached = await readCachedTasks();
      if (cached && !cancelled) dispatch(hydrateFromCache(cached));
      // Revalidate regardless of cache hit.
      dispatch(fetchTasks({ page: 1, pageSize }));
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, pageSize]);

  // Step 3: debounced persistence. Excludes partial stubs (incomplete data).
  useEffect(() => {
    if (tasks.length === 0) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const persistable = tasks.filter((t) => !t.partial);
      void writeCachedTasks({ tasks: persistable, total, loadedPages });
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [tasks, total, loadedPages]);
}
