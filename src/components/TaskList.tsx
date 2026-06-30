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
      className={`cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
        selected ? "bg-blue-100" : ""
      }`}
      aria-selected={selected}
    >
      <td className="px-3 py-2">
        <div className="font-medium text-gray-900">
          {task.title}
          {task.partial && (
            <span
              title="Discovered via a live event before its full record loaded"
              className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
            >
              partial
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400">{task.id}</div>
      </td>
      <td className="px-3 py-2 text-sm capitalize text-gray-600">
        {task.type === "unknown" && task.rawType ? `unknown (${task.rawType})` : task.type}
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={task.status} rawStatus={task.rawStatus} />
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">{task.assignee?.name ?? "Unassigned"}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums text-gray-600">
        {task.annotationCount}
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-500">{relativeTime(task.updatedAt)}</td>
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
      <div
        role="alert"
        className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p className="font-semibold">Failed to load tasks.</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={() => dispatch(fetchTasks({ page: 1, pageSize: 20 }))}
          className="mt-2 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loadStatus === "loading" && rows.length === 0) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        No tasks match your filters.
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
          <th className="px-3 py-2 font-medium">Task</th>
          <th className="px-3 py-2 font-medium">Type</th>
          <th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">Assignee</th>
          <th className="px-3 py-2 text-right font-medium">Annot.</th>
          <th className="px-3 py-2 text-right font-medium">Updated</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((task) => (
          <TaskRow key={task.id} task={task} selected={task.id === selectedId} />
        ))}
      </tbody>
    </table>
  );
}
