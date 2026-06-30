"use client";

/**
 * Console — top-level client container. Wires the bootstrap lifecycle and the
 * live feed, and lays out the list + detail panel.
 */

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useTasksBootstrap } from "@/hooks/useTasksBootstrap";
import { useTaskFeed } from "@/hooks/useTaskFeed";
import { loadNextPage } from "@/store/tasksSlice";
import {
  selectFromCache,
  selectCachedAt,
  selectLoadStatus,
  selectLiveEventCount,
  selectLoadedPages,
  selectServerTotal,
  selectTaskTotal,
  selectSkipped,
} from "@/store/selectors";
import { Filters } from "./Filters";
import { TaskList } from "./TaskList";
import { Pagination } from "./Pagination";
import { DetailPanel } from "./DetailPanel";
import { StatusChart } from "./StatusChart";
import { FeedStatus } from "@/hooks/useTaskFeed";

function FeedPill({ status }: { status: FeedStatus }) {
  const map: Record<FeedStatus, { label: string; cls: string; dot: string }> = {
    open: { label: "Live", cls: "bg-green-50 text-green-700", dot: "bg-green-500" },
    connecting: { label: "Connecting", cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
    reconnecting: { label: "Reconnecting", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500 animate-pulse" },
    closed: { label: "Offline", cls: "bg-red-50 text-red-700", dot: "bg-red-500" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${m.cls}`}>
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function Console() {
  const dispatch = useAppDispatch();
  useTasksBootstrap(20);
  const feedStatus = useTaskFeed();

  const fromCache = useAppSelector(selectFromCache);
  const cachedAt = useAppSelector(selectCachedAt);
  const loadStatus = useAppSelector(selectLoadStatus);
  const liveCount = useAppSelector(selectLiveEventCount);
  const loadedPages = useAppSelector(selectLoadedPages);
  const serverTotal = useAppSelector(selectServerTotal);
  const loadedCount = useAppSelector(selectTaskTotal);
  const skipped = useAppSelector(selectSkipped);

  const allLoaded = loadedCount >= serverTotal && serverTotal > 0;

  return (
    <main className="mx-auto max-w-7xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Annotation Activity Console</h1>
          <p className="text-sm text-gray-500">
            {loadedCount} loaded · {serverTotal} total · {liveCount} live events
            {skipped > 0 && ` · ${skipped} skipped (no id)`}
          </p>
        </div>
        <FeedPill status={feedStatus} />
      </header>

      {fromCache && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing cached data
          {cachedAt ? ` from ${new Date(cachedAt).toLocaleTimeString()}` : ""}. Revalidating…
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <section className="space-y-3">
          <Filters />
          <div className="rounded border border-gray-200 bg-white">
            <TaskList />
          </div>
          <Pagination />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-gray-500">
              Server pages loaded: {loadedPages} · {loadedCount}/{serverTotal}
            </span>
            <button
              type="button"
              onClick={() => dispatch(loadNextPage())}
              disabled={allLoaded || loadStatus === "loading"}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              {allLoaded ? "All loaded" : loadStatus === "loading" ? "Loading…" : "Load more"}
            </button>
          </div>
        </section>

        <aside className="space-y-3">
          <StatusChart />
          <DetailPanel />
        </aside>
      </div>
    </main>
  );
}
