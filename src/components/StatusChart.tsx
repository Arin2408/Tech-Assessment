"use client";

import { useAppSelector } from "@/store/hooks";
import { selectStatusCounts } from "@/store/selectors";
import { TaskStatus } from "@/lib/types";

const ORDER: Array<{ status: TaskStatus; label: string; color: string }> = [
  { status: TaskStatus.Todo, label: "Todo", color: "bg-gray-400" },
  { status: TaskStatus.InProgress, label: "In progress", color: "bg-blue-500" },
  { status: TaskStatus.QA, label: "QA", color: "bg-purple-500" },
  { status: TaskStatus.Blocked, label: "Blocked", color: "bg-red-500" },
  { status: TaskStatus.Done, label: "Done", color: "bg-green-500" },
  { status: TaskStatus.Unknown, label: "Unknown", color: "bg-amber-500" },
];

/** Simple derived metric: tasks-per-status as a horizontal bar chart. */
export function StatusChart() {
  const counts = useAppSelector(selectStatusCounts);
  const max = Math.max(1, ...ORDER.map((o) => counts[o.status]));

  return (
    <div className="rounded border border-gray-200 bg-white p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Tasks per status (loaded)
      </h3>
      <div className="space-y-1">
        {ORDER.map((o) => (
          <div key={o.status} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 text-gray-600">{o.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100">
              <div
                className={`h-full ${o.color}`}
                style={{ width: `${(counts[o.status] / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right tabular-nums text-gray-700">{counts[o.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
