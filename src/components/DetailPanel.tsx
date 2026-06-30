"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSelectedTask } from "@/store/selectors";
import { assignToMe, CURRENT_USER } from "@/store/tasksSlice";
import { selectTask } from "@/store/uiSlice";
import { StatusBadge } from "./StatusBadge";
import { SummaryView } from "./SummaryView";

export function DetailPanel() {
  const dispatch = useAppDispatch();
  const task = useAppSelector(selectSelectedTask);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        Select a task to see details and its AI summary.
      </div>
    );
  }

  const isMine = task.assignee?.id === CURRENT_USER.id;

  const onAssign = async () => {
    setAssignError(null);
    setAssigning(true);
    try {
      await dispatch(assignToMe({ id: task.id })).unwrap();
    } catch (err) {
      setAssignError(typeof err === "string" ? err : "Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
          <p className="text-xs text-gray-400">{task.id}</p>
        </div>
        <button
          type="button"
          aria-label="Close detail panel"
          onClick={() => dispatch(selectTask(null))}
          className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      {task.partial && (
        <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
          This task was discovered through a live event before its full record loaded. Some fields
          are placeholders until it loads from the server.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Type</dt>
        <dd className="capitalize">
          {task.type === "unknown" && task.rawType ? `unknown (${task.rawType})` : task.type}
        </dd>
        <dt className="text-gray-500">Status</dt>
        <dd>
          <StatusBadge status={task.status} rawStatus={task.rawStatus} />
        </dd>
        <dt className="text-gray-500">Assignee</dt>
        <dd>{task.assignee?.name ?? "Unassigned"}</dd>
        <dt className="text-gray-500">Annotations</dt>
        <dd className="tabular-nums">{task.annotationCount}</dd>
        <dt className="text-gray-500">Updated</dt>
        <dd>{task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"}</dd>
      </dl>

      <div className="mt-3">
        <button
          type="button"
          onClick={onAssign}
          disabled={assigning || isMine}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isMine ? "Assigned to me" : assigning ? "Assigning…" : "Assign to me"}
        </button>
        {assignError && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {assignError} — change rolled back.
          </p>
        )}
      </div>

      <SummaryView taskId={task.id} />
    </div>
  );
}
