"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSearch,
  selectStatusFilter,
  selectTypeFilter,
  selectSortField,
  selectSortDir,
} from "@/store/selectors";
import { setSearch, setStatusFilter, setTypeFilter, setSort, SortField } from "@/store/uiSlice";
import { TaskStatus, TaskType } from "@/lib/types";

const TYPE_OPTIONS: Array<{ value: TaskType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
  { value: "text", label: "Text" },
  { value: "unknown", label: "Unknown" },
];

const STATUS_OPTIONS: Array<{ value: TaskStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: TaskStatus.Todo, label: "Todo" },
  { value: TaskStatus.InProgress, label: "In progress" },
  { value: TaskStatus.QA, label: "QA" },
  { value: TaskStatus.Blocked, label: "Blocked" },
  { value: TaskStatus.Done, label: "Done" },
  { value: TaskStatus.Unknown, label: "Unknown" },
];

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "updatedAt", label: "Updated" },
  { value: "annotationCount", label: "Annotations" },
  { value: "title", label: "Title" },
];

const fieldCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20";

export function Filters() {
  const dispatch = useAppDispatch();
  const search = useAppSelector(selectSearch);
  const typeFilter = useAppSelector(selectTypeFilter);
  const statusFilter = useAppSelector(selectStatusFilter);
  const sortField = useAppSelector(selectSortField);
  const sortDir = useAppSelector(selectSortDir);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[14rem] flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          aria-label="Search tasks"
          placeholder="Search title or id…"
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
          className={`${fieldCls} w-full pl-9`}
        />
      </div>

      <select
        aria-label="Filter by type"
        value={typeFilter}
        onChange={(e) => dispatch(setTypeFilter(e.target.value as TaskType | "all"))}
        className={fieldCls}
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by status"
        value={statusFilter}
        onChange={(e) => dispatch(setStatusFilter(e.target.value as TaskStatus | "all"))}
        className={fieldCls}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
        <span className="px-2 text-xs font-medium text-slate-400 dark:text-slate-500">Sort</span>
        <select
          aria-label="Sort field"
          value={sortField}
          onChange={(e) => dispatch(setSort({ field: e.target.value as SortField }))}
          className="border-0 bg-transparent py-2 pl-1 pr-2 text-sm text-slate-700 focus:outline-none focus:ring-0 dark:text-slate-200"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="dark:bg-slate-800">
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={`Toggle sort direction (currently ${sortDir})`}
          onClick={() =>
            dispatch(setSort({ field: sortField, dir: sortDir === "asc" ? "desc" : "asc" }))
          }
          className="border-l border-slate-200 px-2.5 py-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>
    </div>
  );
}
