import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";
import { fetchTasks } from "@/store/tasksSlice";
import { Task, TaskStatus } from "@/lib/types";
import type { RawTasksResponse } from "@/lib/normalize";
import { Filters } from "./Filters";
import { TaskList } from "./TaskList";

function task(p: Partial<Task> & { id: string; title: string }): Task {
  return {
    type: "text",
    status: TaskStatus.Todo,
    rawStatus: "todo",
    updatedAt: 1,
    annotationCount: 0,
    assignee: null,
    meta: {},
    partial: false,
    ...p,
  } as Task;
}

function renderConsole(tasks: Task[]) {
  const store = makeStore();
  const payload: RawTasksResponse = {
    page: 1,
    pageSize: tasks.length,
    total: tasks.length,
    tasks,
    skipped: 0,
  };
  store.dispatch({ type: fetchTasks.fulfilled.type, payload });
  render(
    <Provider store={store}>
      <Filters />
      <TaskList />
    </Provider>,
  );
  return store;
}

describe("TaskList + Filters interaction", () => {
  const sample: Task[] = [
    task({ id: "t1", title: "Image labeling", type: "image", status: TaskStatus.Done }),
    task({ id: "t2", title: "Audio transcript", type: "audio", status: TaskStatus.Todo }),
    task({ id: "t3", title: "Text review", type: "text", status: TaskStatus.Done }),
  ];

  it("renders all loaded tasks initially", () => {
    renderConsole(sample);
    expect(screen.getByText("Image labeling")).toBeInTheDocument();
    expect(screen.getByText("Audio transcript")).toBeInTheDocument();
    expect(screen.getByText("Text review")).toBeInTheDocument();
  });

  it("filtering by status updates the visible rows", async () => {
    const user = userEvent.setup();
    renderConsole(sample);

    await user.selectOptions(screen.getByLabelText("Filter by status"), TaskStatus.Done);

    expect(screen.getByText("Image labeling")).toBeInTheDocument();
    expect(screen.getByText("Text review")).toBeInTheDocument();
    expect(screen.queryByText("Audio transcript")).not.toBeInTheDocument();
  });

  it("searching narrows the visible rows", async () => {
    const user = userEvent.setup();
    renderConsole(sample);

    await user.type(screen.getByLabelText("Search tasks"), "audio");

    expect(screen.getByText("Audio transcript")).toBeInTheDocument();
    expect(screen.queryByText("Image labeling")).not.toBeInTheDocument();
  });

  it("filtering by type updates the visible rows", async () => {
    const user = userEvent.setup();
    renderConsole(sample);

    await user.selectOptions(screen.getByLabelText("Filter by type"), "image");
    const table = screen.getByRole("table");
    expect(within(table).getByText("Image labeling")).toBeInTheDocument();
    expect(within(table).queryByText("Text review")).not.toBeInTheDocument();
  });

  it("shows an empty state when filters match nothing", async () => {
    const user = userEvent.setup();
    renderConsole(sample);
    await user.type(screen.getByLabelText("Search tasks"), "zzz-no-match");
    expect(screen.getByText(/no tasks match/i)).toBeInTheDocument();
  });
});
