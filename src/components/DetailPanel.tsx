"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSelectedTask } from "@/store/selectors";
import { assignToMe, CURRENT_USER } from "@/store/tasksSlice";
import { selectTask } from "@/store/uiSlice";
import { StatusBadge } from "./StatusBadge";
import { SummaryView } from "./SummaryView";
import { Avatar, Card, TypeBadge } from "./ui";

export function DetailPanel() {
  const dispatch = useAppDispatch();
  const task = useAppSelector(selectSelectedTask);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  if (!task) {
    return (
      <Card className="flex h-full min-h-[16rem] flex-col items-center justify-center p-8 text-center">
        <svg className="h-9 w-9 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 14h8" strokeLinecap="round" />
        </svg>
        <p className="mt-3 text-sm font-medium text-slate-600">No task selected</p>
        <p className="mt-1 text-xs text-slate-400">Pick a task to see details and its AI summary.</p>
      </Card>
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
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900">{task.title}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{task.id}</p>
        </div>
        <button
          type="button"
          aria-label="Close detail panel"
          onClick={() => dispatch(selectTask(null))}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {task.partial && (
          <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
            Discovered through a live event before its full record loaded. Some fields are
            placeholders until it loads from the server.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Type</dt>
            <dd className="mt-1">
              <TypeBadge type={task.type} rawType={task.type === "unknown" ? task.rawType : undefined} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={task.status} rawStatus={task.rawStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Assignee</dt>
            <dd className="mt-1 flex items-center gap-2 text-slate-700">
              <Avatar name={task.assignee?.name} id={task.assignee?.id} size="md" />
              {task.assignee?.name ?? "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Annotations</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
              {task.annotationCount}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Updated</dt>
            <dd className="mt-1 text-slate-600">
              {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <button
            type="button"
            onClick={onAssign}
            disabled={assigning || isMine}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMine ? (
              <>✓ Assigned to me</>
            ) : assigning ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Assigning…
              </>
            ) : (
              "Assign to me"
            )}
          </button>
          {assignError && (
            <p role="alert" className="mt-2 text-xs text-rose-600">
              {assignError} — change rolled back.
            </p>
          )}
        </div>

        <SummaryView taskId={task.id} />
      </div>
    </Card>
  );
}
