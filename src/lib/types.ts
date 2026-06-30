/**
 * Domain model — the *clean* internal shapes the UI and store work with.
 *
 * The backend payload is deliberately messy (mixed casing, string/number
 * counts, ISO/epoch timestamps, unknown task types). Everything in this file
 * is the normalized form produced by `normalize.ts`; nothing here tolerates
 * the raw mess. Raw shapes live in `normalize.ts` as `unknown`-narrowed input.
 */

/** Normalized, canonical status. Raw casing/spelling is collapsed into these. */
export enum TaskStatus {
  Todo = "todo",
  InProgress = "in_progress",
  QA = "qa",
  Blocked = "blocked",
  Done = "done",
  /** Raw status we could not map. Kept (not dropped) so it stays visible. */
  Unknown = "unknown",
}

/** Known annotation task types. `unknown` is a first-class variant. */
export type TaskType = "image" | "audio" | "text" | "unknown";

export interface User {
  id: string;
  name: string;
}

/** Free-form server metadata. Intentionally permissive but not `any`. */
export type TaskMeta = Record<string, unknown>;

/** Fields shared by every task variant. */
interface TaskBase {
  id: string;
  title: string;
  status: TaskStatus;
  /** Normalized to epoch milliseconds regardless of the raw format. */
  updatedAt: number;
  /** Normalized to a number; raw could be a string. */
  annotationCount: number;
  /** `null` means unassigned (a real state, not missing data). */
  assignee: User | null;
  meta: TaskMeta;
  /**
   * The raw status string before normalization. Kept so the UI can show the
   * original when status is `Unknown`, and for debugging/round-tripping.
   */
  rawStatus: string;
  /**
   * True when this entity was created from a live event referencing a task we
   * never loaded from REST. It has only the fields the event carried; the rest
   * are placeholders until a full fetch fills them in.
   */
  partial: boolean;
}

/** Discriminated union on `type`. */
export type Task =
  | (TaskBase & { type: "image" })
  | (TaskBase & { type: "audio" })
  | (TaskBase & { type: "text" })
  | (TaskBase & { type: "unknown"; /** original unrecognized type string */ rawType: string });

/** REST list endpoint response shape (after we trust the envelope, not items). */
export interface TasksPage {
  page: number;
  pageSize: number;
  total: number;
  tasks: Task[];
}

// ---------------------------------------------------------------------------
// Live WebSocket event model (normalized).
// ---------------------------------------------------------------------------

export type TaskFeedEvent =
  | { kind: "task.updated"; id: string; status: TaskStatus; rawStatus: string; updatedAt: number }
  | { kind: "task.assigned"; id: string; assignee: User | null }
  | { kind: "annotation.created"; taskId: string; by: string; at: number };

// ---------------------------------------------------------------------------
// Streamed summary state.
// ---------------------------------------------------------------------------

export type SummaryStatus = "idle" | "streaming" | "done" | "error";
