import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { useFreshRef } from "../../hooks/useFreshRef";
import { fetchJobs } from "../../services/jobApi";
import {
  jobListReducer,
  initialState,
  actions,
  type JobListState,
  type Action,
  type SortState,
  type FilterState,
} from "./jobListReducer";
import { useJobListSocket } from "./useJobListSocket";

// --- Context shape ---

export interface JobListContextValue {
  readonly state: JobListState;
  readonly dispatch: Dispatch<Action>;

  readonly loadJobs: (options?: {
    sortField?: string;
    filterField?: string | null;
    filterValue?: string | null;
    pageNum?: number;
  }) => void;
  readonly sortByColumn: (column: string) => void;
  readonly setFilter: (filter: FilterState) => void;
  readonly setPage: (page: number) => void;
  readonly toggleRow: (jobId: number) => void;
}

// --- Context ---

const JobListContext = createContext<JobListContextValue | null>(null);

export function useJobList(): JobListContextValue {
  const ctx = useContext(JobListContext);
  if (!ctx) {
    throw new Error("useJobList must be used within JobListProvider");
  }
  return ctx;
}

// --- Provider ---

interface JobListProviderProps {
  readonly children: ReactNode;
}

export function JobListProvider({ children }: JobListProviderProps) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);
  const [state, dispatch] = useReducer(jobListReducer, initialState);

  // --- Data fetching ---

  const loadJobs = useCallback(
    (options?: {
      sortField?: string;
      filterField?: string | null;
      filterValue?: string | null;
      pageNum?: number;
    }) => {
      const sortField = options?.sortField ?? state.sort.field;
      const filterField =
        options?.filterField !== undefined
          ? options.filterField
          : state.filter.field;
      const filterValue =
        options?.filterValue !== undefined
          ? options.filterValue
          : state.filter.value;
      const page = options?.pageNum ?? state.activePage;

      // Update sort/filter/page state if changed
      if (options?.sortField !== undefined) {
        const direction = options.sortField.startsWith("-") ? "desc" : "asc";
        const column = options.sortField.replace(/^-/, "");
        dispatch({
          type: actions.SET_SORT,
          sort: { column, direction, field: options.sortField } as SortState,
        });
      }
      if (
        options?.filterField !== undefined &&
        options?.filterValue !== undefined
      ) {
        dispatch({
          type: actions.SET_FILTER,
          filter: { field: options.filterField, value: options.filterValue },
        });
      }
      if (options?.pageNum !== undefined) {
        dispatch({ type: actions.SET_PAGE, page: options.pageNum });
      }

      const currentToken = tokenRef.current;
      if (!currentToken) return;

      dispatch({ type: actions.FETCH_STARTED });

      fetchJobs(currentToken, sortField, filterField, filterValue, page).then(
        (result) => {
          if (result.error != null) {
            dispatch({ type: actions.FETCH_FAILED, error: result.error });
          } else {
            dispatch({
              type: actions.FETCH_SUCCESS,
              jobs: result.jobs,
              totalPages: result.totalPages,
            });
          }
        },
      );
    },

    [
      state.sort.field,
      state.filter.field,
      state.filter.value,
      state.activePage,
      tokenRef,
    ],
  );

  // --- Named actions ---

  const sortByColumn = useCallback(
    (column: string) => {
      let newDirection: "asc" | "desc";
      if (state.sort.column === column) {
        newDirection = state.sort.direction === "desc" ? "asc" : "desc";
      } else {
        newDirection = "asc";
      }
      const newSortField = newDirection === "desc" ? `-${column}` : column;
      loadJobs({ sortField: newSortField });
    },
    [state.sort.column, state.sort.direction, loadJobs],
  );

  const setFilter = useCallback(
    (filter: FilterState) => {
      loadJobs({ filterField: filter.field, filterValue: filter.value });
    },
    [loadJobs],
  );

  const setPage = useCallback(
    (page: number) => {
      loadJobs({ pageNum: page });
    },
    [loadJobs],
  );

  const toggleRow = useCallback((jobId: number) => {
    dispatch({ type: actions.TOGGLE_ROW, jobId });
  }, []);

  // --- Socket ---

  const onJobUpdate = useCallback(() => {
    loadJobs();
  }, [loadJobs]);

  useJobListSocket(token, dispatch, onJobUpdate);

  // --- Initial load ---
  // Intentionally depends only on token — we want a single fetch when
  // the token first becomes available, not on every sort/filter/page change.

  useEffect(() => {
    if (token) {
      loadJobs();
    }
  }, [token]);

  // --- Context value ---

  const value = useMemo(
    (): JobListContextValue => ({
      state,
      dispatch,
      loadJobs,
      sortByColumn,
      setFilter,
      setPage,
      toggleRow,
    }),
    [state, loadJobs, sortByColumn, setFilter, setPage, toggleRow],
  );

  return (
    <JobListContext.Provider value={value}>{children}</JobListContext.Provider>
  );
}
