"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSearch,
  selectStatusFilter,
  selectTypeFilter,
  selectSortField,
  selectSortDir,
} from "@/store/selectors";
import {
  setSearch,
  setStatusFilter,
  setTypeFilter,
  setSort,
  SortField,
} from "@/store/uiSlice";
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

const selectCls =
  "rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

export function Filters() {
  const dispatch = useAppDispatch();
  const search = useAppSelector(selectSearch);
  const typeFilter = useAppSelector(selectTypeFilter);
  const statusFilter = useAppSelector(selectStatusFilter);
  const sortField = useAppSelector(selectSortField);
  const sortDir = useAppSelector(selectSortDir);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        aria-label="Search tasks"
        placeholder="Search title or id…"
        value={search}
        onChange={(e) => dispatch(setSearch(e.target.value))}
        className={`${selectCls} min-w-[12rem] flex-1`}
      />

      <select
        aria-label="Filter by type"
        value={typeFilter}
        onChange={(e) => dispatch(setTypeFilter(e.target.value as TaskType | "all"))}
        className={selectCls}
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
        className={selectCls}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Sort</label>
        <select
          aria-label="Sort field"
          value={sortField}
          onChange={(e) => dispatch(setSort({ field: e.target.value as SortField }))}
          className={selectCls}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={`Toggle sort direction (currently ${sortDir})`}
          onClick={() => dispatch(setSort({ field: sortField, dir: sortDir === "asc" ? "desc" : "asc" }))}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm hover:bg-gray-50"
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>
    </div>
  );
}
