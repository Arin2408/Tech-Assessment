"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPagedTasks } from "@/store/selectors";
import { setDisplayPage } from "@/store/uiSlice";

export function Pagination() {
  const dispatch = useAppDispatch();
  const { page, totalPages, totalFiltered, pageSize } = useAppSelector(selectPagedTasks);

  const from = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalFiltered);

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
      <span aria-live="polite">
        {totalFiltered === 0 ? "No matching tasks" : `Showing ${from}–${to} of ${totalFiltered}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
          onClick={() => dispatch(setDisplayPage(page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span className="px-1">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
          onClick={() => dispatch(setDisplayPage(page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
