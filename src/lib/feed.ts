/**
 * Parse raw WebSocket frames into the normalized `TaskFeedEvent` union.
 * Same trust-boundary discipline as normalize.ts: input is `unknown`, output
 * is a clean event or `null` (unrecognized frames are ignored, not thrown on).
 */

import { TaskFeedEvent } from "./types";
import { normalizeStatus, normalizeTimestamp, normalizeAssignee } from "./normalize";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

export function parseFeedEvent(raw: unknown): TaskFeedEvent | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isObject(data)) return null;

  const kind = data.kind;
  const payload = isObject(data.payload) ? data.payload : {};

  switch (kind) {
    case "task.updated": {
      const id = asString(payload.id);
      if (!id) return null;
      return {
        kind: "task.updated",
        id,
        status: normalizeStatus(payload.status),
        rawStatus: asString(payload.status),
        updatedAt: normalizeTimestamp(payload.updatedAt),
      };
    }
    case "task.assigned": {
      const id = asString(payload.id);
      if (!id) return null;
      return { kind: "task.assigned", id, assignee: normalizeAssignee(payload.assignee) };
    }
    case "annotation.created": {
      const taskId = asString(payload.taskId);
      if (!taskId) return null;
      return {
        kind: "annotation.created",
        taskId,
        by: asString(payload.by),
        at: normalizeTimestamp(payload.at),
      };
    }
    default:
      return null;
  }
}
