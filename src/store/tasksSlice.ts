/**
 * tasks slice — normalized task entities via createEntityAdapter.
 *
 * Source of truth for *all loaded* tasks (accumulated across server pages plus
 * tasks discovered through live events). Filtering/sorting/paging for display
 * is derived in selectors, never stored here.
 */

import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  PayloadAction,
  EntityState,
} from "@reduxjs/toolkit";
import { Task, TaskFeedEvent, TaskStatus } from "@/lib/types";
import { fetchTasksPage, API_BASE } from "@/lib/api";
import { CachedTaskList } from "@/lib/idb";

export const tasksAdapter = createEntityAdapter<Task>({
  // Default sort by most-recently-updated; selectors re-sort per the UI anyway.
  sortComparer: (a, b) => b.updatedAt - a.updatedAt,
});

export type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface TasksExtraState {
  loadStatus: LoadStatus;
  error: string | null;
  total: number;
  /** Highest contiguous server page loaded. */
  loadedPages: number;
  pageSize: number;
  /** Number of raw records skipped across loads (no id). Surfaced in UI. */
  skipped: number;
  /** True while showing IndexedDB data that has not yet been revalidated. */
  fromCache: boolean;
  cachedAt: number | null;
  /** Count of live events applied — drives the "live" indicator. */
  liveEventCount: number;
}

const initialExtra: TasksExtraState = {
  loadStatus: "idle",
  error: null,
  total: 0,
  loadedPages: 0,
  pageSize: 20,
  skipped: 0,
  fromCache: false,
  cachedAt: null,
  liveEventCount: 0,
};

type TasksState = EntityState<Task, string> & TasksExtraState;

const initialState: TasksState = tasksAdapter.getInitialState(initialExtra);

// --- thunks -----------------------------------------------------------------

/** Fetch a specific server page and merge its tasks into the store. */
export const fetchTasks = createAsyncThunk(
  "tasks/fetchPage",
  async (args: { page: number; pageSize: number }, { signal }) => {
    return fetchTasksPage({ ...args, signal });
  },
);

/** Convenience: load the next not-yet-loaded server page. */
export const loadNextPage = createAsyncThunk(
  "tasks/loadNextPage",
  async (_: void, { getState, dispatch }) => {
    const state = (getState() as { tasks: TasksState }).tasks;
    const nextPage = state.loadedPages + 1;
    await dispatch(fetchTasks({ page: nextPage, pageSize: state.pageSize })).unwrap();
  },
);

/** The "me" the console is acting as (no auth in this exercise). */
export const CURRENT_USER = { id: "u-me", name: "Me" };

/**
 * Optimistic "assign to me" with rollback (bonus).
 * We apply the assignment locally first, then PATCH the server. The mock has no
 * write endpoint, so this PATCH 404s — which is exactly what exercises the
 * rollback path: on any failure we restore the previous assignee and reject.
 */
export const assignToMe = createAsyncThunk<
  void,
  { id: string },
  { state: { tasks: TasksState }; rejectValue: string }
>("tasks/assignToMe", async ({ id }, { getState, dispatch, rejectWithValue }) => {
  const prev = getState().tasks.entities[id]?.assignee ?? null;
  dispatch(slice.actions.setAssignee({ id, assignee: CURRENT_USER }));
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee: CURRENT_USER }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    dispatch(slice.actions.setAssignee({ id, assignee: prev })); // rollback
    return rejectWithValue(err instanceof Error ? err.message : "assign failed");
  }
});

// --- helpers for live-event merging ----------------------------------------

/** A placeholder task created from an event that referenced an unloaded id. */
function makePartialTask(id: string, patch: Partial<Task>): Task {
  return {
    id,
    title: `(unloaded) ${id}`,
    type: "unknown",
    rawType: "",
    status: TaskStatus.Unknown,
    rawStatus: "",
    updatedAt: 0,
    annotationCount: 0,
    assignee: null,
    meta: {},
    partial: true,
    ...patch,
  } as Task;
}

const slice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    /** Hydrate instantly from IndexedDB on startup; marks data as cached. */
    hydrateFromCache(state, action: PayloadAction<CachedTaskList>) {
      tasksAdapter.setAll(state, action.payload.tasks);
      state.total = action.payload.total;
      state.loadedPages = action.payload.loadedPages;
      state.fromCache = true;
      state.cachedAt = action.payload.cachedAt;
      state.loadStatus = state.loadStatus === "idle" ? "succeeded" : state.loadStatus;
    },

    /** Apply one normalized live event. */
    applyFeedEvent(state, action: PayloadAction<TaskFeedEvent>) {
      const ev = action.payload;
      state.liveEventCount += 1;

      switch (ev.kind) {
        case "task.updated": {
          const existing = state.entities[ev.id];
          if (existing) {
            // Guard against out-of-order events: never regress updatedAt.
            if (ev.updatedAt >= existing.updatedAt) {
              existing.status = ev.status;
              existing.rawStatus = ev.rawStatus;
              existing.updatedAt = ev.updatedAt;
            }
          } else {
            tasksAdapter.addOne(
              state,
              makePartialTask(ev.id, {
                status: ev.status,
                rawStatus: ev.rawStatus,
                updatedAt: ev.updatedAt,
              }),
            );
          }
          break;
        }
        case "task.assigned": {
          const existing = state.entities[ev.id];
          if (existing) {
            existing.assignee = ev.assignee;
          } else {
            tasksAdapter.addOne(state, makePartialTask(ev.id, { assignee: ev.assignee }));
          }
          break;
        }
        case "annotation.created": {
          const existing = state.entities[ev.taskId];
          if (existing) {
            existing.annotationCount += 1;
            if (ev.at >= existing.updatedAt) existing.updatedAt = ev.at;
          } else {
            tasksAdapter.addOne(
              state,
              makePartialTask(ev.taskId, { annotationCount: 1, updatedAt: ev.at }),
            );
          }
          break;
        }
      }
    },

    /** Optimistic local assignment (used by the bonus "assign to me" action). */
    setAssignee(state, action: PayloadAction<{ id: string; assignee: Task["assignee"] }>) {
      const t = state.entities[action.payload.id];
      if (t) t.assignee = action.payload.assignee;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loadStatus = "loading";
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        const { tasks, total, page, pageSize, skipped } = action.payload;
        // upsertMany merges: a full record replaces a prior partial stub but
        // also overwrites any live-event changes that arrived for loaded tasks.
        // We keep the freshest by updatedAt to avoid clobbering newer live data.
        for (const incoming of tasks) {
          const existing = state.entities[incoming.id];
          if (existing && !existing.partial && existing.updatedAt > incoming.updatedAt) {
            // Local copy is newer (a live event already advanced it); keep it.
            continue;
          }
          tasksAdapter.upsertOne(state, incoming);
        }
        state.total = total;
        state.pageSize = pageSize || state.pageSize;
        state.loadedPages = Math.max(state.loadedPages, page);
        state.skipped += skipped;
        state.loadStatus = "succeeded";
        state.error = null;
        state.fromCache = false; // fresh data has arrived
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        // Ignore aborts (intentional cancellation), surface real errors.
        if (action.error.name === "AbortError") return;
        state.loadStatus = "failed";
        state.error = action.error.message ?? "Unknown error loading tasks";
      });
  },
});

export const { hydrateFromCache, applyFeedEvent, setAssignee } = slice.actions;
export default slice.reducer;
export type { TasksState };
