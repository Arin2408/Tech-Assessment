"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPagedTasks } from "@/store/selectors";
import { setDisplayPage } from "@/store/uiSlice";

const btn =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:shadow-none dark:hover:bg-slate-700";

export function Pagination() {
  const dispatch = useAppDispatch();
  const { page, totalPages, totalFiltered, pageSize } = useAppSelector(selectPagedTasks);

  const from = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalFiltered);

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span aria-live="polite">
        {totalFiltered === 0 ? (
          "No matching tasks"
        ) : (
          <>
            Showing <span className="font-medium text-slate-700 dark:text-slate-200">{from}–{to}</span> of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{totalFiltered}</span>
          </>
        )}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btn} onClick={() => dispatch(setDisplayPage(page - 1))} disabled={page <= 1}>
          Prev
        </button>
        <span className="px-1 text-slate-500">
          Page <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span> / {totalPages}
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => dispatch(setDisplayPage(page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
