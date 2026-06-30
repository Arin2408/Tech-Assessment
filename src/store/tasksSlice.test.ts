import { makeStore } from "./store";
import { fetchTasks, applyFeedEvent } from "./tasksSlice";
import { selectTaskById, selectAllTasks } from "./selectors";
import { Task, TaskStatus } from "@/lib/types";
import type { RawTasksResponse } from "@/lib/normalize";

function task(p: Partial<Task> & { id: string }): Task {
  return {
    title: p.id,
    type: "text",
    status: TaskStatus.Todo,
    rawStatus: "todo",
    updatedAt: 1000,
    annotationCount: 0,
    assignee: null,
    meta: {},
    partial: false,
    ...p,
  } as Task;
}

function seed(store: ReturnType<typeof makeStore>, tasks: Task[]) {
  const payload: RawTasksResponse = { page: 1, pageSize: tasks.length, total: 137, tasks, skipped: 0 };
  store.dispatch({ type: fetchTasks.fulfilled.type, payload });
}

describe("live-event merging", () => {
  it("task.updated changes status on a loaded task", () => {
    const store = makeStore();
    seed(store, [task({ id: "t1", updatedAt: 1000 })]);
    store.dispatch(
      applyFeedEvent({ kind: "task.updated", id: "t1", status: TaskStatus.Done, rawStatus: "done", updatedAt: 2000 }),
    );
    expect(selectTaskById(store.getState(), "t1")?.status).toBe(TaskStatus.Done);
  });

  it("ignores out-of-order updates that would regress updatedAt", () => {
    const store = makeStore();
    seed(store, [task({ id: "t1", updatedAt: 5000, status: TaskStatus.Done })]);
    store.dispatch(
      applyFeedEvent({ kind: "task.updated", id: "t1", status: TaskStatus.Todo, rawStatus: "todo", updatedAt: 1000 }),
    );
    // stale event ignored — status stays Done
    expect(selectTaskById(store.getState(), "t1")?.status).toBe(TaskStatus.Done);
  });

  it("creates a flagged partial stub when the event references an unloaded task", () => {
    const store = makeStore();
    seed(store, [task({ id: "t1" })]);
    store.dispatch(
      applyFeedEvent({ kind: "task.updated", id: "t999", status: TaskStatus.Done, rawStatus: "done", updatedAt: 3000 }),
    );
    const stub = selectTaskById(store.getState(), "t999");
    expect(stub).toBeDefined();
    expect(stub?.partial).toBe(true);
    expect(stub?.status).toBe(TaskStatus.Done);
  });

  it("annotation.created increments the count", () => {
    const store = makeStore();
    seed(store, [task({ id: "t1", annotationCount: 2 })]);
    store.dispatch(applyFeedEvent({ kind: "annotation.created", taskId: "t1", by: "u1", at: 4000 }));
    expect(selectTaskById(store.getState(), "t1")?.annotationCount).toBe(3);
  });

  it("task.assigned updates the assignee", () => {
    const store = makeStore();
    seed(store, [task({ id: "t1" })]);
    store.dispatch(
      applyFeedEvent({ kind: "task.assigned", id: "t1", assignee: { id: "u2", name: "Ben" } }),
    );
    expect(selectTaskById(store.getState(), "t1")?.assignee).toEqual({ id: "u2", name: "Ben" });
  });

  it("a later full fetch replaces a partial stub", () => {
    const store = makeStore();
    seed(store, [task({ id: "t1" })]);
    store.dispatch(
      applyFeedEvent({ kind: "task.updated", id: "t50", status: TaskStatus.Done, rawStatus: "done", updatedAt: 100 }),
    );
    expect(selectTaskById(store.getState(), "t50")?.partial).toBe(true);

    // Full record arrives via pagination with a newer timestamp.
    seed(store, [task({ id: "t50", title: "Task 50", updatedAt: 9000, status: TaskStatus.QA })]);
    const full = selectTaskById(store.getState(), "t50");
    expect(full?.partial).toBe(false);
    expect(full?.title).toBe("Task 50");
    expect(selectAllTasks(store.getState()).length).toBe(2);
  });
});
