import {
  jobListReducer as reducer,
  initialState,
  actions,
  type Action,
  type SortState,
  type FilterState,
} from "./jobListReducer";
import type { Job } from "../../../types/job";

// The reducer treats jobs opaquely (it only stores/replaces the array), so
// minimal partial fixtures cast to Job[] are sufficient here — mirroring the
// `as Job[]` fixture pattern used in JobList.test.tsx.
const sampleJobs = [
  { id: 101, status: "FINISHED" },
  { id: 102, status: "RUNNING" },
] as Job[];

describe("jobListReducer", () => {
  describe("FETCH_STARTED", () => {
    test("sets loading and clears any previous error", () => {
      const state = { ...initialState, error: "boom" };

      const result = reducer(state, { type: actions.FETCH_STARTED });

      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("FETCH_SUCCESS", () => {
    test("stores jobs and totalPages and clears loading", () => {
      const state = { ...initialState, loading: true };

      const result = reducer(state, {
        type: actions.FETCH_SUCCESS,
        jobs: sampleJobs,
        totalPages: 7,
      });

      expect(result.loading).toBe(false);
      expect(result.jobs).toEqual(sampleJobs);
      expect(result.totalPages).toBe(7);
    });
  });

  describe("FETCH_FAILED", () => {
    test("clears loading and jobs and records the error", () => {
      const state = { ...initialState, loading: true, jobs: sampleJobs };

      const result = reducer(state, {
        type: actions.FETCH_FAILED,
        error: "network down",
      });

      expect(result.loading).toBe(false);
      expect(result.jobs).toEqual([]);
      expect(result.error).toBe("network down");
    });
  });

  describe("SET_SORT", () => {
    test("replaces sort and resets expanded rows", () => {
      const state = { ...initialState, expandedRows: new Set([1, 2]) };
      const sort: SortState = {
        column: "status",
        direction: "asc",
        field: "status",
      };

      const result = reducer(state, { type: actions.SET_SORT, sort });

      expect(result.sort).toEqual(sort);
      expect(result.expandedRows.size).toBe(0);
    });
  });

  describe("SET_FILTER", () => {
    test("replaces the filter", () => {
      const filter: FilterState = { field: "status", value: "RUNNING" };

      const result = reducer(initialState, {
        type: actions.SET_FILTER,
        filter,
      });

      expect(result.filter).toEqual(filter);
    });
  });

  describe("SET_PAGE", () => {
    test("sets the active page and resets expanded rows", () => {
      const state = { ...initialState, expandedRows: new Set([5]) };

      const result = reducer(state, { type: actions.SET_PAGE, page: 3 });

      expect(result.activePage).toBe(3);
      expect(result.expandedRows.size).toBe(0);
    });
  });

  describe("TOGGLE_ROW", () => {
    test("expands a currently-collapsed row", () => {
      const result = reducer(initialState, {
        type: actions.TOGGLE_ROW,
        jobId: 42,
      });

      expect(result.expandedRows.has(42)).toBe(true);
    });

    test("collapses an already-expanded row", () => {
      const state = { ...initialState, expandedRows: new Set([42]) };

      const result = reducer(state, { type: actions.TOGGLE_ROW, jobId: 42 });

      expect(result.expandedRows.has(42)).toBe(false);
    });

    test("does not mutate the previous expandedRows set", () => {
      const expandedRows = new Set<number>([1]);
      const state = { ...initialState, expandedRows };

      reducer(state, { type: actions.TOGGLE_ROW, jobId: 2 });

      expect([...expandedRows]).toEqual([1]);
    });
  });

  describe("COLLAPSE_ALL_ROWS", () => {
    test("clears all expanded rows", () => {
      const state = { ...initialState, expandedRows: new Set([1, 2, 3]) };

      const result = reducer(state, { type: actions.COLLAPSE_ALL_ROWS });

      expect(result.expandedRows.size).toBe(0);
    });
  });

  describe("APPEND_LOG", () => {
    test("appends a log line", () => {
      const result = reducer(initialState, {
        type: actions.APPEND_LOG,
        line: "hello",
      });

      expect(result.logLines).toEqual(["hello"]);
    });

    test("drops the oldest line when exceeding MAX_LOG_LINES", () => {
      const state = {
        ...initialState,
        logLines: Array.from({ length: 1000 }, (_, i) => `line-${i}`),
      };

      const result = reducer(state, {
        type: actions.APPEND_LOG,
        line: "new-line",
      });

      expect(result.logLines).toHaveLength(1000);
      expect(result.logLines[0]).toBe("line-1");
      expect(result.logLines[999]).toBe("new-line");
    });
  });

  test("returns the current state for an unknown action", () => {
    const result = reducer(initialState, {
      type: "BOGUS",
    } as unknown as Action);

    expect(result).toBe(initialState);
  });
});
