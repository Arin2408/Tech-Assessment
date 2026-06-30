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
import {
  selectAllTasks,
  selectLoadStatus,
  selectLoadedPages,
  selectServerTotal,
} from "@/store/selectors";

const PERSIST_DEBOUNCE_MS = 800;
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 15_000;

export function useTasksBootstrap(pageSize = 20): void {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasks);
  const total = useAppSelector(selectServerTotal);
  const loadedPages = useAppSelector(selectLoadedPages);
  const loadStatus = useAppSelector(selectLoadStatus);
  const didInit = useRef(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);

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

  // Self-heal: if the initial load failed (e.g. the mock server wasn't up
  // yet), keep retrying with capped backoff so the UI recovers on its own once
  // the API becomes reachable — no manual refresh needed. Resets on success.
  useEffect(() => {
    if (loadStatus === "failed") {
      const attempt = retryAttempt.current++;
      const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
      retryTimer.current = setTimeout(() => {
        dispatch(fetchTasks({ page: 1, pageSize }));
      }, delay);
    } else if (loadStatus === "succeeded") {
      retryAttempt.current = 0;
    }
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [loadStatus, dispatch, pageSize]);

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
