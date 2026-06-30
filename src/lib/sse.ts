/**
 * Minimal SSE frame parser, kept pure and separate from React so it can be
 * unit-tested. We deliberately do NOT use the browser `EventSource`: it
 * auto-reconnects when the server ends the stream (which our mock does on
 * completion), causing an infinite re-request loop, and it can't be aborted
 * with an AbortController. Reading the fetch body stream ourselves gives clean
 * cancellation and no surprise reconnects.
 */

export interface SseFrame {
  /** Event name from an `event:` line, or "message" by default. */
  event: string;
  /** Joined `data:` lines for the frame. */
  data: string;
}

/**
 * Stateful incremental parser. Feed it decoded text chunks; it returns whatever
 * complete frames are now available and retains the partial remainder.
 */
export function createSseParser() {
  let buffer = "";

  function push(chunk: string): SseFrame[] {
    buffer += chunk;
    const frames: SseFrame[] = [];
    // SSE frames are separated by a blank line. Normalize CRLF first.
    const normalized = buffer.replace(/\r\n/g, "\n");
    const parts = normalized.split("\n\n");
    // last part is an incomplete frame; keep it buffered.
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const frame = parseFrame(part);
      if (frame) frames.push(frame);
    }
    return frames;
  }

  return { push };
}

function parseFrame(block: string): SseFrame | null {
  if (!block.trim()) return null;
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue; // comment
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    // Spec: strip a single leading space after the colon.
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0 && event === "message") return null;
  return { event, data: dataLines.join("\n") };
}

/**
 * Interpret one frame from the mock's summary stream.
 *  - `event: done` (data "end") signals completion.
 *  - default frames carry a JSON-encoded markdown chunk string.
 * Returns the text chunk to append, or a control signal.
 */
export type SummarySignal =
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "ignore" };

export function interpretSummaryFrame(frame: SseFrame): SummarySignal {
  if (frame.event === "done") return { type: "done" };
  if (!frame.data) return { type: "ignore" };
  try {
    const parsed: unknown = JSON.parse(frame.data);
    if (typeof parsed === "string") return { type: "chunk", text: parsed };
    return { type: "ignore" };
  } catch {
    // Not JSON (e.g. the literal "end"): treat plain "end" as done, else raw text.
    if (frame.data === "end") return { type: "done" };
    return { type: "chunk", text: frame.data };
  }
}
