/**
 * Thin REST client for the mock server. Returns normalized domain objects so
 * callers (thunks) never see raw shapes.
 */

import { normalizeTasksResponse, RawTasksResponse } from "./normalize";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? API_BASE.replace(/^http/, "ws") + "/ws";

export interface FetchTasksArgs {
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}

export async function fetchTasksPage({
  page,
  pageSize,
  signal,
}: FetchTasksArgs): Promise<RawTasksResponse> {
  const url = `${API_BASE}/api/tasks?page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch tasks (page ${page}): HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  return normalizeTasksResponse(json);
}

export function summaryUrl(taskId: string): string {
  return `${API_BASE}/api/tasks/${encodeURIComponent(taskId)}/summary`;
}
