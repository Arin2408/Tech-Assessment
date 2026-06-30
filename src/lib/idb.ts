/**
 * IndexedDB-backed cache of the most recently loaded task list (via
 * localforage). IndexedDB writes happen off the main thread, and we keep the
 * payload to just the normalized tasks + metadata so reload is instant.
 *
 * Honesty rule: we store the timestamp of the cache so the UI can show "showing
 * cached data from <time>" until a fresh server response replaces it.
 */

import localforage from "localforage";
import { Task } from "./types";

const STORE_KEY = "tasks:list:v1";

let store: LocalForage | null = null;

function getStore(): LocalForage {
  if (!store) {
    store = localforage.createInstance({
      name: "annotation-console",
      storeName: "cache",
      description: "Cached task list for instant reload",
    });
  }
  return store;
}

export interface CachedTaskList {
  tasks: Task[];
  total: number;
  /** Highest server page we had loaded when this snapshot was written. */
  loadedPages: number;
  /** epoch ms when this snapshot was persisted. */
  cachedAt: number;
}

/** Read the cached list. Returns null on miss or any read error (cache is best-effort). */
export async function readCachedTasks(): Promise<CachedTaskList | null> {
  try {
    const v = await getStore().getItem<CachedTaskList>(STORE_KEY);
    if (v && Array.isArray(v.tasks)) return v;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the list. Best-effort: failures are swallowed (caching must never
 * break the app). Async, so it does not block rendering.
 */
export async function writeCachedTasks(value: Omit<CachedTaskList, "cachedAt">): Promise<void> {
  try {
    await getStore().setItem<CachedTaskList>(STORE_KEY, {
      ...value,
      cachedAt: Date.now(),
    });
  } catch {
    /* best-effort cache; ignore quota / private-mode errors */
  }
}

export async function clearCachedTasks(): Promise<void> {
  try {
    await getStore().removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
