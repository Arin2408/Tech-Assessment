import { TaskStatus } from "@/lib/types";

const LABEL: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: "Todo",
  [TaskStatus.InProgress]: "In progress",
  [TaskStatus.QA]: "QA",
  [TaskStatus.Blocked]: "Blocked",
  [TaskStatus.Done]: "Done",
  [TaskStatus.Unknown]: "Unknown",
};

const COLOR: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: "bg-gray-100 text-gray-700",
  [TaskStatus.InProgress]: "bg-blue-100 text-blue-700",
  [TaskStatus.QA]: "bg-purple-100 text-purple-700",
  [TaskStatus.Blocked]: "bg-red-100 text-red-700",
  [TaskStatus.Done]: "bg-green-100 text-green-700",
  [TaskStatus.Unknown]: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status, rawStatus }: { status: TaskStatus; rawStatus?: string }) {
  // When unknown, show the original raw value so nothing is hidden.
  const text =
    status === TaskStatus.Unknown && rawStatus ? `Unknown (${rawStatus})` : LABEL[status];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${COLOR[status]}`}>
      {text}
    </span>
  );
}
