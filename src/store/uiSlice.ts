/**
 * uiSlice — view state: filters, search, sort, selection, and client-side
 * display pagination. Kept separate from the tasks entity state so selectors
 * can derive the visible view without re-running on unrelated entity churn.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TaskStatus, TaskType } from "@/lib/types";

export type SortField = "updatedAt" | "annotationCount" | "title";
export type SortDir = "asc" | "desc";

export interface UiState {
  search: string;
  typeFilter: TaskType | "all";
  statusFilter: TaskStatus | "all";
  sortField: SortField;
  sortDir: SortDir;
  selectedId: string | null;
  /** 1-based page for the *client-side* display pagination over filtered rows. */
  displayPage: number;
  displayPageSize: number;
}

const initialState: UiState = {
  search: "",
  typeFilter: "all",
  statusFilter: "all",
  sortField: "updatedAt",
  sortDir: "desc",
  selectedId: null,
  displayPage: 1,
  displayPageSize: 20,
};

const slice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.displayPage = 1;
    },
    setTypeFilter(state, action: PayloadAction<UiState["typeFilter"]>) {
      state.typeFilter = action.payload;
      state.displayPage = 1;
    },
    setStatusFilter(state, action: PayloadAction<UiState["statusFilter"]>) {
      state.statusFilter = action.payload;
      state.displayPage = 1;
    },
    setSort(state, action: PayloadAction<{ field: SortField; dir?: SortDir }>) {
      const { field, dir } = action.payload;
      if (dir) {
        state.sortField = field;
        state.sortDir = dir;
      } else if (state.sortField === field) {
        // toggle direction when re-selecting the same field
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDir = field === "title" ? "asc" : "desc";
      }
    },
    selectTask(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    setDisplayPage(state, action: PayloadAction<number>) {
      state.displayPage = Math.max(1, action.payload);
    },
  },
});

export const {
  setSearch,
  setTypeFilter,
  setStatusFilter,
  setSort,
  selectTask,
  setDisplayPage,
} = slice.actions;
export default slice.reducer;
