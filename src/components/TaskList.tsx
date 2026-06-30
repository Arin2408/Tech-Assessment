"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectPagedTasks,
  selectSelectedId,
  selectLoadStatus,
  selectError,
} from "@/store/selectors";
import { selectTask } from "@/store/uiSlice";
import { fetchTasks } from "@/store/tasksSlice";
import { Task } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Avatar, TypeBadge } from "./ui";

function relativeTime(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ms).toLocaleDateString();
}

function TaskRow({ task, selected }: { task: Task; selected: boolean }) {
  const dispatch = useAppDispatch();
  return (
    <tr
      onClick={() => dispatch(selectTask(task.id))}
      className={`group cursor-pointer border-b border-slate-100 transition last:border-0 dark:border-slate-800 ${
        selected ? "bg-indigo-50/70 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
      }`}
      aria-selected={selected}
    >
      <td className="relative px-4 py-3">
        {selected && <span className="absolute inset-y-0 left-0 w-1 rounded-r bg-indigo-500" />}
        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
          <span className="truncate">{task.title}</span>
          {task.partial && (
            <span
              title="Discovered via a live event before its full record loaded"
              className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
            >
              partial
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-xs text-slate-400 dark:text-slate-500">{task.id}</div>
      </td>
      <td className="px-4 py-3">
        <TypeBadge type={task.type} rawType={task.type === "unknown" ? task.rawType : undefined} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={task.status} rawStatus={task.rawStatus} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Avatar name={task.assignee?.name} id={task.assignee?.id} />
          <span className="truncate">{task.assignee?.name ?? "Unassigned"}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
        {task.annotationCount}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-500 dark:text-slate-400">
        {relativeTime(task.updatedAt)}
      </td>
    </tr>
  );
}

export function TaskList() {
  const dispatch = useAppDispatch();
  const { rows } = useAppSelector(selectPagedTasks);
  const selectedId = useAppSelector(selectSelectedId);
  const loadStatus = useAppSelector(selectLoadStatus);
  const error = useAppSelector(selectError);

  if (loadStatus === "failed") {
    return (
      <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        <p className="font-semibold">Failed to load tasks.</p>
        <p className="mt-1 text-rose-600 dark:text-rose-400">{error}</p>
        <button
          type="button"
          onClick={() => dispatch(fetchTasks({ page: 1, pageSize: 20 }))}
          className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loadStatus === "loading" && rows.length === 0) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading tasks">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="m-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
        <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">No tasks match your filters.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Try clearing the search or changing the type/status.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <th className="px-4 py-2.5">Task</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Assignee</th>
            <th className="px-4 py-2.5 text-right">Annot.</th>
            <th className="px-4 py-2.5 text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => (
            <TaskRow key={task.id} task={task} selected={task.id === selectedId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
