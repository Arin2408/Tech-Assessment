import { createSseParser, interpretSummaryFrame } from "./sse";

describe("createSseParser", () => {
  it("emits complete frames and buffers partial ones across chunks", () => {
    const parser = createSseParser();
    // Build two full frames, then split the stream mid-way through the second.
    const full = `data: ${JSON.stringify("## Hello")}\n\ndata: ${JSON.stringify("world")}\n\n`;
    const splitAt = full.indexOf("world") + 2; // cut inside the second frame
    const chunkA = full.slice(0, splitAt);
    const chunkB = full.slice(splitAt);

    let frames = parser.push(chunkA);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.data).toBe(JSON.stringify("## Hello"));

    frames = parser.push(chunkB);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.data).toBe(JSON.stringify("world"));
  });

  it("parses named events", () => {
    const parser = createSseParser();
    const frames = parser.push("event: done\ndata: end\n\n");
    expect(frames[0]!.event).toBe("done");
    expect(frames[0]!.data).toBe("end");
  });
});

describe("interpretSummaryFrame", () => {
  it("decodes JSON-encoded markdown chunks", () => {
    expect(interpretSummaryFrame({ event: "message", data: JSON.stringify("**hi**") })).toEqual({
      type: "chunk",
      text: "**hi**",
    });
  });

  it("recognizes the done event", () => {
    expect(interpretSummaryFrame({ event: "done", data: "end" })).toEqual({ type: "done" });
  });
});
