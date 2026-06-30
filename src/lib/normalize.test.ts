import {
  normalizeTask,
  normalizeStatus,
  normalizeCount,
  normalizeTimestamp,
  normalizeAssignee,
  normalizeTasksResponse,
} from "./normalize";
import { TaskStatus } from "./types";

describe("normalizeStatus", () => {
  it("collapses inconsistent casing and spelling to the canonical enum", () => {
    expect(normalizeStatus("in_progress")).toBe(TaskStatus.InProgress);
    expect(normalizeStatus("InProgress")).toBe(TaskStatus.InProgress);
    expect(normalizeStatus("QA")).toBe(TaskStatus.QA);
    expect(normalizeStatus("BLOCKED")).toBe(TaskStatus.Blocked);
    expect(normalizeStatus("todo")).toBe(TaskStatus.Todo);
    expect(normalizeStatus("done")).toBe(TaskStatus.Done);
  });

  it("maps unrecognized / garbage values to Unknown (never throws)", () => {
    expect(normalizeStatus("weird")).toBe(TaskStatus.Unknown);
    expect(normalizeStatus(null)).toBe(TaskStatus.Unknown);
    expect(normalizeStatus(undefined)).toBe(TaskStatus.Unknown);
    expect(normalizeStatus(42)).toBe(TaskStatus.Unknown);
  });
});

describe("normalizeCount", () => {
  it("coerces numeric strings and numbers, clamps to non-negative integers", () => {
    expect(normalizeCount(3)).toBe(3);
    expect(normalizeCount("12")).toBe(12);
    expect(normalizeCount("  7 ")).toBe(7);
    expect(normalizeCount(2.9)).toBe(2);
    expect(normalizeCount(-5)).toBe(0);
  });

  it("returns 0 for non-numeric garbage", () => {
    expect(normalizeCount("abc")).toBe(0);
    expect(normalizeCount(null)).toBe(0);
    expect(normalizeCount({})).toBe(0);
  });
});

describe("normalizeTimestamp", () => {
  it("passes through epoch ms and parses ISO strings to epoch ms", () => {
    expect(normalizeTimestamp(1719600000000)).toBe(1719600000000);
    const iso = new Date(1719600000000).toISOString();
    expect(normalizeTimestamp(iso)).toBe(1719600000000);
  });

  it("returns 0 for unparseable values", () => {
    expect(normalizeTimestamp("not-a-date")).toBe(0);
    expect(normalizeTimestamp(null)).toBe(0);
  });
});

describe("normalizeAssignee", () => {
  it("keeps valid users and treats null/garbage as unassigned", () => {
    expect(normalizeAssignee({ id: "u1", name: "Asha" })).toEqual({ id: "u1", name: "Asha" });
    expect(normalizeAssignee(null)).toBeNull();
    expect(normalizeAssignee({})).toBeNull();
    expect(normalizeAssignee({ id: "u2" })).toEqual({ id: "u2", name: "u2" });
  });
});

describe("normalizeTask", () => {
  it("builds a known-type task and normalizes every messy field", () => {
    const t = normalizeTask({
      id: "t2",
      title: "Task 2",
      type: "image",
      status: "InProgress",
      assignee: { id: "u2", name: "Ben" },
      annotationCount: "12",
      updatedAt: new Date(1719600000000).toISOString(),
      meta: { priority: "high" },
    });
    expect(t).not.toBeNull();
    expect(t!.type).toBe("image");
    expect(t!.status).toBe(TaskStatus.InProgress);
    expect(t!.annotationCount).toBe(12);
    expect(t!.updatedAt).toBe(1719600000000);
    expect(t!.assignee).toEqual({ id: "u2", name: "Ben" });
    expect(t!.partial).toBe(false);
  });

  it("represents an unknown type ('video') as the unknown variant, keeping rawType", () => {
    const t = normalizeTask({ id: "t11", title: "Task 11", type: "video", status: "done" });
    expect(t!.type).toBe("unknown");
    if (t!.type === "unknown") expect(t!.rawType).toBe("video");
  });

  it("returns null only when there is no id (the one case we drop)", () => {
    expect(normalizeTask({ title: "no id" })).toBeNull();
    expect(normalizeTask(null)).toBeNull();
    expect(normalizeTask("garbage")).toBeNull();
  });

  it("does not crash on a fully garbage object and preserves raw status", () => {
    const t = normalizeTask({ id: "x", status: "WeirdStatus", type: 123, annotationCount: {} });
    expect(t!.status).toBe(TaskStatus.Unknown);
    expect(t!.rawStatus).toBe("WeirdStatus");
    expect(t!.type).toBe("unknown");
    expect(t!.annotationCount).toBe(0);
  });
});

describe("normalizeTasksResponse", () => {
  it("normalizes the envelope and counts skipped (id-less) records", () => {
    const res = normalizeTasksResponse({
      page: 1,
      pageSize: 2,
      total: 137,
      items: [
        { id: "t1", title: "Task 1", type: "text", status: "todo" },
        { title: "no id — should be skipped" },
      ],
    });
    expect(res.tasks).toHaveLength(1);
    expect(res.skipped).toBe(1);
    expect(res.total).toBe(137);
  });
});
