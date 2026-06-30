/**
 * Memoized selectors. UI reads ONLY from here, never from raw state.
 *
 * The pipeline: all loaded entities -> filter (type/status/search) -> sort
 * (updatedAt | annotationCount | title) -> client-side page slice. Each stage
 * is memoized so unrelated state churn (e.g. a live event on a hidden task)
 * doesn't recompute the whole view unless inputs actually change.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { tasksAdapter } from "./tasksSlice";
import { Task, TaskStatus } from "@/lib/types";

const adapterSelectors = tasksAdapter.getSelectors<RootState>((s) => s.tasks);

export const selectAllTasks = adapterSelectors.selectAll;
export const selectTaskById = adapterSelectors.selectById;
export const selectTaskTotal = adapterSelectors.selectTotal;

// raw slice accessors
export const selectLoadStatus = (s: RootState) => s.tasks.loadStatus;
export const selectError = (s: RootState) => s.tasks.error;
export const selectServerTotal = (s: RootState) => s.tasks.total;
export const selectLoadedPages = (s: RootState) => s.tasks.loadedPages;
export const selectSkipped = (s: RootState) => s.tasks.skipped;
export const selectFromCache = (s: RootState) => s.tasks.fromCache;
export const selectCachedAt = (s: RootState) => s.tasks.cachedAt;
export const selectLiveEventCount = (s: RootState) => s.tasks.liveEventCount;

// ui accessors
export const selectUi = (s: RootState) => s.ui;
export const selectSelectedId = (s: RootState) => s.ui.selectedId;
export const selectSearch = (s: RootState) => s.ui.search;
export const selectTypeFilter = (s: RootState) => s.ui.typeFilter;
export const selectStatusFilter = (s: RootState) => s.ui.statusFilter;
export const selectSortField = (s: RootState) => s.ui.sortField;
export const selectSortDir = (s: RootState) => s.ui.sortDir;
export const selectDisplayPage = (s: RootState) => s.ui.displayPage;
export const selectDisplayPageSize = (s: RootState) => s.ui.displayPageSize;

// --- filtered view ----------------------------------------------------------

export const selectFilteredTasks = createSelector(
  [selectAllTasks, selectTypeFilter, selectStatusFilter, selectSearch],
  (tasks, typeFilter, statusFilter, search) => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  },
);

function compareTasks(a: Task, b: Task, field: string): number {
  switch (field) {
    case "annotationCount":
      return a.annotationCount - b.annotationCount;
    case "title":
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    case "updatedAt":
    default:
      return a.updatedAt - b.updatedAt;
  }
}

export const selectSortedTasks = createSelector(
  [selectFilteredTasks, selectSortField, selectSortDir],
  (tasks, field, dir) => {
    const sign = dir === "asc" ? 1 : -1;
    // copy before sort — never mutate selector input (and thus store state).
    return [...tasks].sort((a, b) => {
      const primary = compareTasks(a, b, field) * sign;
      // stable tiebreak by id so equal keys keep a deterministic order.
      return primary !== 0 ? primary : a.id.localeCompare(b.id);
    });
  },
);

// --- client-side display pagination ----------------------------------------

export interface PagedView {
  rows: Task[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
}

export const selectPagedTasks = createSelector(
  [selectSortedTasks, selectDisplayPage, selectDisplayPageSize],
  (tasks, page, pageSize): PagedView => {
    const totalFiltered = tasks.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      rows: tasks.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      totalFiltered,
      totalPages,
    };
  },
);

export const selectSelectedTask = createSelector(
  [selectAllTasks, selectSelectedId],
  (tasks, id) => (id ? tasks.find((t) => t.id === id) ?? null : null),
);

// --- derived metric: tasks-per-status (bonus chart) -------------------------

export type StatusCounts = Record<TaskStatus, number>;

export const selectStatusCounts = createSelector([selectAllTasks], (tasks): StatusCounts => {
  const counts: StatusCounts = {
    [TaskStatus.Todo]: 0,
    [TaskStatus.InProgress]: 0,
    [TaskStatus.QA]: 0,
    [TaskStatus.Blocked]: 0,
    [TaskStatus.Done]: 0,
    [TaskStatus.Unknown]: 0,
  };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
});
