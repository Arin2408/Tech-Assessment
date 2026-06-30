import { TaskStatus } from "@/lib/types";

const LABEL: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: "Todo",
  [TaskStatus.InProgress]: "In progress",
  [TaskStatus.QA]: "QA",
  [TaskStatus.Blocked]: "Blocked",
  [TaskStatus.Done]: "Done",
  [TaskStatus.Unknown]: "Unknown",
};

const STYLE: Record<TaskStatus, { chip: string; dot: string }> = {
  [TaskStatus.Todo]: { chip: "bg-slate-50 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  [TaskStatus.InProgress]: { chip: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  [TaskStatus.QA]: { chip: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  [TaskStatus.Blocked]: { chip: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  [TaskStatus.Done]: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  [TaskStatus.Unknown]: { chip: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
};

export function StatusBadge({ status, rawStatus }: { status: TaskStatus; rawStatus?: string }) {
  const text =
    status === TaskStatus.Unknown && rawStatus ? `Unknown · ${rawStatus}` : LABEL[status];
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {text}
    </span>
  );
}
