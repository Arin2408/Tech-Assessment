"use client";

/**
 * useTaskSummary — stream a task's AI summary and expose the markdown as it
 * builds up. Re-runs whenever `taskId` changes; switching tasks aborts the
 * in-flight stream (via AbortController) before starting the new one.
 *
 * Returns the accumulated raw markdown text (sanitization happens at render
 * time in <Markdown/>, the single trust boundary for untrusted HTML).
 */

import { useEffect, useRef, useState } from "react";
import { summaryUrl } from "@/lib/api";
import { createSseParser, interpretSummaryFrame } from "@/lib/sse";
import { SummaryStatus } from "@/lib/types";

export interface SummaryState {
  text: string;
  status: SummaryStatus;
  error: string | null;
}

const IDLE: SummaryState = { text: "", status: "idle", error: null };

export function useTaskSummary(taskId: string | null): SummaryState {
  const [state, setState] = useState<SummaryState>(IDLE);
  const accRef = useRef("");

  useEffect(() => {
    if (!taskId) {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    accRef.current = "";
    setState({ text: "", status: "streaming", error: null });

    (async () => {
      try {
        const res = await fetch(summaryUrl(taskId), {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });
        if (!res.ok || !res.body) {
          throw new Error(`Summary stream failed: HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const frames = parser.push(decoder.decode(value, { stream: true }));
          let finished = false;
          for (const frame of frames) {
            const sig = interpretSummaryFrame(frame);
            if (sig.type === "chunk") {
              accRef.current += sig.text;
              // Functional-ish update via fresh object so React re-renders
              // incrementally as each chunk arrives.
              setState({ text: accRef.current, status: "streaming", error: null });
            } else if (sig.type === "done") {
              finished = true;
            }
          }
          if (finished) break;
        }

        if (!controller.signal.aborted) {
          setState({ text: accRef.current, status: "done", error: null });
        }
      } catch (err) {
        if (controller.signal.aborted) return; // intentional cancel; stay quiet
        const message = err instanceof Error ? err.message : "Stream error";
        setState({ text: accRef.current, status: "error", error: message });
      }
    })();

    return () => {
      controller.abort(); // cancel the old stream when task changes / unmounts
    };
  }, [taskId]);

  return state;
}
