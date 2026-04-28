// --- Types ---

export interface Job {
  readonly id: number;
  readonly function_name: string | null;
  readonly status: string;
  readonly scheduled_by: string | null;
  readonly start_time: string | null;
  readonly finish_time: string | null;
  readonly comment: string | null;
  readonly ticket_ref: string | null;
  readonly start_arguments: Record<string, unknown> | null;
  readonly next_job_id: number | null;
  readonly change_score: number | null;
  readonly finished_devices: string[] | null;
  readonly result: unknown;
  readonly exception: { message?: string; traceback?: string } | null;
}

export interface SortState {
  readonly column: string;
  readonly direction: "asc" | "desc";
  readonly field: string;
}

export interface FilterState {
  readonly field: string | null;
  readonly value: string | null;
}

export interface JobListState {
  readonly jobs: Job[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly sort: SortState;
  readonly filter: FilterState;
  readonly activePage: number;
  readonly totalPages: number;
  readonly expandedRows: Set<number>;
  readonly logLines: string[];
}

// --- Action types ---

export const actions = {
  FETCH_STARTED: "FETCH_STARTED",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_FAILED: "FETCH_FAILED",

  SET_SORT: "SET_SORT",
  SET_FILTER: "SET_FILTER",
  SET_PAGE: "SET_PAGE",

  TOGGLE_ROW: "TOGGLE_ROW",
  COLLAPSE_ALL_ROWS: "COLLAPSE_ALL_ROWS",

  APPEND_LOG: "APPEND_LOG",
} as const;

export type Action =
  | { type: typeof actions.FETCH_STARTED }
  | { type: typeof actions.FETCH_SUCCESS; jobs: Job[]; totalPages: number }
  | { type: typeof actions.FETCH_FAILED; error: string }
  | { type: typeof actions.SET_SORT; sort: SortState }
  | { type: typeof actions.SET_FILTER; filter: FilterState }
  | { type: typeof actions.SET_PAGE; page: number }
  | { type: typeof actions.TOGGLE_ROW; jobId: number }
  | { type: typeof actions.COLLAPSE_ALL_ROWS }
  | { type: typeof actions.APPEND_LOG; line: string };

// --- Initial state ---

export const initialState: JobListState = {
  jobs: [],
  loading: true,
  error: null,
  sort: { column: "id", direction: "desc", field: "-id" },
  filter: { field: null, value: null },
  activePage: 1,
  totalPages: 1,
  expandedRows: new Set(),
  logLines: [],
};

// --- Reducer ---

const MAX_LOG_LINES = 1000;

export function jobListReducer(
  state: JobListState,
  action: Action,
): JobListState {
  switch (action.type) {
    case actions.FETCH_STARTED:
      return { ...state, loading: true, error: null };

    case actions.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        jobs: action.jobs,
        totalPages: action.totalPages,
      };

    case actions.FETCH_FAILED:
      return { ...state, loading: false, jobs: [], error: action.error };

    case actions.SET_SORT:
      return { ...state, sort: action.sort, expandedRows: new Set() };

    case actions.SET_FILTER:
      return { ...state, filter: action.filter };

    case actions.SET_PAGE:
      return { ...state, activePage: action.page, expandedRows: new Set() };

    case actions.TOGGLE_ROW: {
      const next = new Set(state.expandedRows);
      if (next.has(action.jobId)) {
        next.delete(action.jobId);
      } else {
        next.add(action.jobId);
      }
      return { ...state, expandedRows: next };
    }

    case actions.COLLAPSE_ALL_ROWS:
      return { ...state, expandedRows: new Set() };

    case actions.APPEND_LOG: {
      const logLines = [...state.logLines, action.line];
      if (logLines.length > MAX_LOG_LINES) {
        logLines.shift();
      }
      return { ...state, logLines };
    }

    default:
      return state;
  }
}
