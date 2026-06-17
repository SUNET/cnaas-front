import {
  configChangeReducer as reducer,
  initialState,
  actions,
  type Action,
} from "./configChangeReducer";

describe("configChangeReducer", () => {
  describe("APPEND_LOG", () => {
    test("appends a log line", () => {
      const result = reducer(initialState, {
        type: actions.APPEND_LOG,
        line: "hello",
      });

      expect(result.logLines).toEqual(["hello"]);
    });

    test("truncates oldest line when exceeding MAX_LOG_LINES", () => {
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

  describe("SET_REPO_REFRESHING", () => {
    test("plants the sentinel job id when a refresh begins with no job id", () => {
      const result = reducer(initialState, {
        type: actions.SET_REPO_REFRESHING,
        refreshing: true,
      });

      expect(result.isRepoRefreshing).toBe(true);
      expect(result.repoJobId).toBe(-1);
    });

    test("does not overwrite an already-adopted real job id when a refresh begins", () => {
      const state = { ...initialState, repoJobId: 192021 };

      const result = reducer(state, {
        type: actions.SET_REPO_REFRESHING,
        refreshing: true,
      });

      expect(result.isRepoRefreshing).toBe(true);
      expect(result.repoJobId).toBe(192021);
    });

    test("stopping a refresh never clobbers the real job id back to the sentinel", () => {
      const state = {
        ...initialState,
        isRepoRefreshing: true,
        repoJobId: 192021,
      };

      const result = reducer(state, {
        type: actions.SET_REPO_REFRESHING,
        refreshing: false,
      });

      expect(result.isRepoRefreshing).toBe(false);
      expect(result.repoJobId).toBe(192021);
    });

    test("stopping a refresh with no job id leaves it null", () => {
      const state = { ...initialState, isRepoRefreshing: true };

      const result = reducer(state, {
        type: actions.SET_REPO_REFRESHING,
        refreshing: false,
      });

      expect(result.isRepoRefreshing).toBe(false);
      expect(result.repoJobId).toBeNull();
    });
  });

  describe("RESET_STATE", () => {
    test("returns to initial state", () => {
      const state = {
        ...initialState,
        devices: [
          { hostname: "sw1", synchronized: false, state: "MANAGED" as const },
        ],
        logLines: ["some log"],
        blockNavigation: true,
        synctoForce: true,
      };

      const result = reducer(state, { type: actions.RESET_STATE });

      expect(result).toEqual(initialState);
    });
  });

  test("returns current state for unknown action", () => {
    const result = reducer(initialState, {
      type: "BOGUS",
    } as unknown as Action);

    expect(result).toBe(initialState);
  });
});
