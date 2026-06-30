import { render } from "@testing-library/react";
import { TaskTicker } from "./TaskTicker";

describe("TaskTicker (fixed)", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("does not fetch on mount while nothing is selected (Bug 4 fix)", () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "t1", title: "T1", updatedAt: 1 }) }),
    );
    // jsdom has no global fetch; install our mock.
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    render(<TaskTicker apiBase="http://localhost:4000" />);
    // Original buggy version fired fetch(`/api/tasks/null`) on mount.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders an empty list without crashing", () => {
    const { container } = render(<TaskTicker apiBase="http://localhost:4000" />);
    expect(container.querySelector("ul")).toBeTruthy();
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});
