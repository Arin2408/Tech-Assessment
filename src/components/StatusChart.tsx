"use client";

import { useAppSelector } from "@/store/hooks";
import { selectStatusCounts } from "@/store/selectors";
import { Card } from "./ui";
import { TaskStatus } from "@/lib/types";

const ORDER: Array<{ status: TaskStatus; label: string; bar: string }> = [
  { status: TaskStatus.Todo, label: "Todo", bar: "bg-slate-400" },
  { status: TaskStatus.InProgress, label: "In progress", bar: "bg-blue-500" },
  { status: TaskStatus.QA, label: "QA", bar: "bg-violet-500" },
  { status: TaskStatus.Blocked, label: "Blocked", bar: "bg-rose-500" },
  { status: TaskStatus.Done, label: "Done", bar: "bg-emerald-500" },
  { status: TaskStatus.Unknown, label: "Unknown", bar: "bg-amber-500" },
];

/** Derived metric: tasks-per-status as a horizontal bar chart. */
export function StatusChart() {
  const counts = useAppSelector(selectStatusCounts);
  const total = ORDER.reduce((acc, o) => acc + counts[o.status], 0);
  const max = Math.max(1, ...ORDER.map((o) => counts[o.status]));

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tasks per status
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">{total} loaded</span>
      </div>
      <div className="space-y-2">
        {ORDER.map((o) => {
          const n = counts[o.status];
          return (
            <div key={o.status} className="flex items-center gap-3 text-xs">
              <span className="w-24 shrink-0 text-slate-600 dark:text-slate-300">{o.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${o.bar} transition-[width] duration-500`}
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </div>
              <span className="w-7 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">{n}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
