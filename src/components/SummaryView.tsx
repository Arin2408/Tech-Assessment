"use client";

import { useTaskSummary } from "@/hooks/useTaskSummary";
import { Markdown } from "./Markdown";

export function SummaryView({ taskId }: { taskId: string }) {
  const { text, status, error } = useTaskSummary(taskId);

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
            <path d="M12 3l1.9 4.7L19 9.5l-4 3.3 1.3 5.2L12 15.8 7.7 18l1.3-5.2-4-3.3 5.1-1.8z" strokeLinejoin="round" />
          </svg>
          AI Summary
        </h3>
        {status === "streaming" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
            streaming…
          </span>
        )}
        {status === "done" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            ✓ complete
          </span>
        )}
      </div>

      {status === "error" && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          Summary stream failed: {error}
        </div>
      )}

      {text ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <Markdown content={text} />
          {status === "streaming" && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-indigo-400 align-text-bottom" />
          )}
        </div>
      ) : (
        status === "streaming" && (
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
            Waiting for first chunk…
          </div>
        )
      )}
    </section>
  );
}
