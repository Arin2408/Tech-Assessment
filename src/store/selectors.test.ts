import { makeStore } from "./store";
import { fetchTasks } from "./tasksSlice";
import { setStatusFilter, setSearch, setTypeFilter, setSort } from "./uiSlice";
import { selectFilteredTasks, selectSortedTasks, selectStatusCounts } from "./selectors";
import { Task, TaskStatus } from "@/lib/types";
import type { RawTasksResponse } from "@/lib/normalize";

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.title ?? partial.id,
    type: "text",
    status: TaskStatus.Todo,
    rawStatus: "todo",
    updatedAt: 0,
    annotationCount: 0,
    assignee: null,
    meta: {},
    partial: false,
    ...partial,
  } as Task;
}

/** Seed the store by resolving a fetchTasks thunk with a fixed payload. */
function seed(store: ReturnType<typeof makeStore>, tasks: Task[]) {
  const payload: RawTasksResponse = {
    page: 1,
    pageSize: tasks.length,
    total: tasks.length,
    tasks,
    skipped: 0,
  };
  store.dispatch({ type: fetchTasks.fulfilled.type, payload });
}

describe("task selectors", () => {
  const sample: Task[] = [
    task({ id: "t1", title: "Image one", type: "image", status: TaskStatus.Done, updatedAt: 300, annotationCount: 5 }),
    task({ id: "t2", title: "Audio two", type: "audio", status: TaskStatus.Todo, updatedAt: 100, annotationCount: 2 }),
    task({ id: "t3", title: "Text three", type: "text", status: TaskStatus.Done, updatedAt: 200, annotationCount: 9 }),
  ];

  it("filters by status", () => {
    const store = makeStore();
    seed(store, sample);
    store.dispatch(setStatusFilter(TaskStatus.Done));
    const filtered = selectFilteredTasks(store.getState());
    expect(filtered.map((t) => t.id).sort()).toEqual(["t1", "t3"]);
  });

  it("filters by type and search together", () => {
    const store = makeStore();
    seed(store, sample);
    store.dispatch(setTypeFilter("audio"));
    expect(selectFilteredTasks(store.getState()).map((t) => t.id)).toEqual(["t2"]);

    store.dispatch(setTypeFilter("all"));
    store.dispatch(setSearch("three"));
    expect(selectFilteredTasks(store.getState()).map((t) => t.id)).toEqual(["t3"]);
  });

  it("sorts by updatedAt desc by default and toggles direction", () => {
    const store = makeStore();
    seed(store, sample);
    expect(selectSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t1", "t3", "t2"]);

    store.dispatch(setSort({ field: "updatedAt", dir: "asc" }));
    expect(selectSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });

  it("sorts by annotationCount", () => {
    const store = makeStore();
    seed(store, sample);
    store.dispatch(setSort({ field: "annotationCount", dir: "desc" }));
    expect(selectSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
  });

  it("derives tasks-per-status counts", () => {
    const store = makeStore();
    seed(store, sample);
    const counts = selectStatusCounts(store.getState());
    expect(counts[TaskStatus.Done]).toBe(2);
    expect(counts[TaskStatus.Todo]).toBe(1);
  });
});
