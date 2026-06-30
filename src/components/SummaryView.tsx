"use client";

import { useTaskSummary } from "@/hooks/useTaskSummary";
import { Markdown } from "./Markdown";

export function SummaryView({ taskId }: { taskId: string }) {
  const { text, status, error } = useTaskSummary(taskId);

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700">AI Summary</h3>
        {status === "streaming" && (
          <span className="flex items-center gap-1 text-xs text-blue-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
            streaming…
          </span>
        )}
        {status === "done" && <span className="text-xs text-green-600">complete</span>}
      </div>

      {status === "error" && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Summary stream failed: {error}
        </div>
      )}

      {text ? (
        <div className="rounded border border-gray-200 bg-white p-3">
          <Markdown content={text} />
        </div>
      ) : (
        status === "streaming" && <div className="text-sm text-gray-400">Waiting for first chunk…</div>
      )}
    </section>
  );
}
