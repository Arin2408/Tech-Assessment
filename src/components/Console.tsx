"use client";

/**
 * Console — top-level client container. Wires the bootstrap lifecycle and the
 * live feed, and lays out the list + detail panel.
 */

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useTasksBootstrap } from "@/hooks/useTasksBootstrap";
import { useTaskFeed, FeedStatus } from "@/hooks/useTaskFeed";
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
import { Card } from "./ui";
import { ThemeToggle } from "./ThemeToggle";

function FeedPill({ status }: { status: FeedStatus }) {
  const map: Record<FeedStatus, { label: string; cls: string; dot: string }> = {
    open: { label: "Live", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30", dot: "bg-emerald-500" },
    connecting: { label: "Connecting", cls: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700", dot: "bg-slate-400 animate-pulse" },
    reconnecting: { label: "Reconnecting", cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30", dot: "bg-amber-500 animate-pulse" },
    closed: { label: "Offline", cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30", dot: "bg-rose-500" },
  };
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${m.cls}`}
    >
      <span className="relative flex h-2 w-2">
        {status === "open" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${m.dot}`} />
      </span>
      {m.label}
    </span>
  );
}

function Stat({ label, value, accent = "text-slate-900 dark:text-slate-100" }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${accent}`}>{value}</span>
    </div>
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
    <div className="min-h-screen">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
                Annotation Activity Console
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live task monitoring &amp; AI summaries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FeedPill status={feedStatus} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {/* Stat strip */}
        <Card className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5">
          <Stat label="Loaded" value={loadedCount} accent="text-indigo-600" />
          <Stat label="Total" value={serverTotal} />
          <Stat label="Live events" value={liveCount} accent="text-emerald-600" />
          {skipped > 0 && <Stat label="Skipped (no id)" value={skipped} accent="text-amber-600" />}
        </Card>

        {fromCache && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
            Showing cached data
            {cachedAt ? ` from ${new Date(cachedAt).toLocaleTimeString()}` : ""}. Revalidating…
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_24rem]">
          <section className="space-y-3">
            <Filters />
            <Card>
              <TaskList />
            </Card>
            <Card className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <Pagination />
            </Card>
            <div className="flex items-center justify-between gap-2 px-1 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Server pages loaded: <span className="font-medium text-slate-700 dark:text-slate-200">{loadedPages}</span> ·{" "}
                {loadedCount}/{serverTotal}
              </span>
              <button
                type="button"
                onClick={() => dispatch(loadNextPage())}
                disabled={allLoaded || loadStatus === "loading"}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-700"
              >
                {loadStatus === "loading" && !allLoaded && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500 dark:border-slate-600" />
                )}
                {allLoaded ? "All loaded" : loadStatus === "loading" ? "Loading…" : "Load more"}
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <StatusChart />
            <DetailPanel />
          </aside>
        </div>
      </main>
    </div>
  );
}
