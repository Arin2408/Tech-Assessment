/**
 * normalize.ts — turn raw, messy backend payloads into the clean domain model.
 *
 * Guarantees:
 *  - Never throws on a single bad record. A record we cannot make sense of is
 *    coerced into a safe shape (Unknown status / unknown type), never dropped
 *    silently and never crashes the whole list.
 *  - Every messy field has one documented coercion rule (see each helper).
 *
 * Raw input is typed as `unknown` and narrowed here on purpose — this file is
 * the single trust boundary between "whatever the server sent" and our model.
 */

import { Task, TaskStatus, TaskType, User, TaskMeta } from "./types";

// --- primitive narrowing helpers -------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

/**
 * Counts arrive as either number or numeric string. Anything non-numeric
 * (null, undefined, "abc") becomes 0 — a count must be a non-negative integer.
 */
export function normalizeCount(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
  }
  return 0;
}

/**
 * Timestamps are either epoch-ms numbers or ISO strings. We normalize to epoch
 * ms. Unparseable values become 0 (epoch) so sorting stays total and the row
 * stays visible at the bottom rather than being dropped.
 */
export function normalizeTimestamp(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

/**
 * Status arrives with inconsistent casing and spelling. We collapse it to the
 * canonical enum by lowercasing and stripping separators. Unrecognized values
 * map to `Unknown` (kept + flagged via rawStatus), not dropped.
 */
export function normalizeStatus(v: unknown): TaskStatus {
  const raw = asString(v).trim().toLowerCase().replace(/[\s-]+/g, "_");
  switch (raw) {
    case "todo":
      return TaskStatus.Todo;
    case "in_progress":
    case "inprogress":
      return TaskStatus.InProgress;
    case "qa":
      return TaskStatus.QA;
    case "blocked":
      return TaskStatus.Blocked;
    case "done":
      return TaskStatus.Done;
    default:
      return TaskStatus.Unknown;
  }
}

const KNOWN_TYPES: readonly TaskType[] = ["image", "audio", "text"];

function isKnownType(v: string): v is Exclude<TaskType, "unknown"> {
  return (KNOWN_TYPES as readonly string[]).includes(v);
}

/** Assignee is `{id,name}` or null. A malformed object becomes null. */
export function normalizeAssignee(v: unknown): User | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const name = asString(v.name);
  if (!id) return null;
  return { id, name: name || id };
}

function normalizeMeta(v: unknown): TaskMeta {
  return isObject(v) ? v : {};
}

// --- the main entry points --------------------------------------------------

/**
 * Normalize a single raw task. `id` is the one field we cannot invent; if it's
 * missing we return null and the caller skips it (the only case where dropping
 * is correct — an entity with no identity cannot live in the store).
 */
export function normalizeTask(raw: unknown): Task | null {
  if (!isObject(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;

  const title = asString(raw.title, `Untitled ${id}`);
  const status = normalizeStatus(raw.status);
  const rawStatus = asString(raw.status, "");
  const updatedAt = normalizeTimestamp(raw.updatedAt);
  const annotationCount = normalizeCount(raw.annotationCount);
  const assignee = normalizeAssignee(raw.assignee);
  const meta = normalizeMeta(raw.meta);

  const base = {
    id,
    title,
    status,
    rawStatus,
    updatedAt,
    annotationCount,
    assignee,
    meta,
    partial: false,
  };

  const rawType = asString(raw.type).trim().toLowerCase();
  if (isKnownType(rawType)) {
    return { ...base, type: rawType };
  }
  // Unknown / missing type (e.g. "video"): keep the original for the UI.
  return { ...base, type: "unknown", rawType: asString(raw.type, "unknown") };
}

export interface NormalizeListResult {
  tasks: Task[];
  /** Count of raw items we had to skip (no id). Surfaced for honesty. */
  skipped: number;
}

/** Normalize the `items` array from /api/tasks. */
export function normalizeTaskList(rawItems: unknown): NormalizeListResult {
  if (!Array.isArray(rawItems)) return { tasks: [], skipped: 0 };
  const tasks: Task[] = [];
  let skipped = 0;
  for (const raw of rawItems) {
    const t = normalizeTask(raw);
    if (t) tasks.push(t);
    else skipped += 1;
  }
  return { tasks, skipped };
}

/** Parse + validate the /api/tasks envelope, tolerating a missing field. */
export interface RawTasksResponse {
  page: number;
  pageSize: number;
  total: number;
  tasks: Task[];
  skipped: number;
}

export function normalizeTasksResponse(raw: unknown): RawTasksResponse {
  const obj = isObject(raw) ? raw : {};
  const { tasks, skipped } = normalizeTaskList(obj.items);
  return {
    page: normalizeCount(obj.page) || 1,
    pageSize: normalizeCount(obj.pageSize) || tasks.length,
    total: normalizeCount(obj.total),
    tasks,
    skipped,
  };
}
