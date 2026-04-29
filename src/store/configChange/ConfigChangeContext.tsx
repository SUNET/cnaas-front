import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { useFreshRef } from "../../hooks/useFreshRef";
import { getData } from "../../utils/getData";
import {
  fetchDeviceList,
  fetchSyncHistory,
  startDeviceSync,
  type DeviceSyncOptions,
} from "../../services/configChangeApi";
import {
  configChangeReducer,
  initialState,
  actions,
  type ConfigChangeState,
  type CommitTarget,
  type DryRunProgress,
  type LiveRunProgress,
  type ConfirmRunProgress,
} from "./configChangeReducer";
import { useConfigChangeSocket } from "./useConfigChangeSocket";

// --- Derived state ---

export interface DryRunDerived {
  readonly status: string;
  readonly results: Record<string, unknown>;
  readonly changeScore: string;
  readonly jobId: number | string;
}

export interface LiveRunDerived {
  readonly status: string;
  readonly results: string | Record<string, unknown>;
  readonly jobId: number | string;
}

export interface ConfirmRunDerived {
  readonly status: string;
  readonly jobId: number | string;
}

function deriveDryRun(data: DryRunProgress): DryRunDerived {
  if (data.id == null) {
    return { status: "", results: {}, changeScore: "", jobId: "NA" };
  }
  return {
    status: data.status ?? "",
    changeScore: data.change_score ?? "",
    jobId: data.id,
    results: data.status === "FINISHED" ? (data.result?.devices ?? {}) : {},
  };
}

function deriveLiveRun(data: LiveRunProgress): LiveRunDerived {
  if (data.id == null) {
    return { status: "", results: "", jobId: "NA" };
  }
  return {
    status: data.status ?? "",
    jobId: data.id,
    results: data.status === "FINISHED" ? (data.result?.devices ?? "") : "",
  };
}

function deriveConfirmRun(data: ConfirmRunProgress): ConfirmRunDerived {
  if (data.id == null) {
    return { status: "", jobId: "NA" };
  }
  return {
    status: data.status ?? "",
    jobId: data.id,
  };
}

// --- Context shape ---

interface ConfigChangeContextValue {
  readonly state: ConfigChangeState;
  readonly dryRun: DryRunDerived;
  readonly liveRun: LiveRunDerived;
  readonly confirmRun: ConfirmRunDerived;
  readonly allRepoJobs: number[];
  readonly commitTarget: CommitTarget;
  readonly isRepoRefreshing: boolean;
  readonly deviceSyncStart: (options?: DeviceSyncOptions) => Promise<void>;
  readonly handleRepoRefreshing: (isRefreshing: boolean) => Promise<void>;
  readonly handleDryRunReady: () => void;
  readonly resetState: () => Promise<void>;
  readonly setSynctoForce: (force: boolean) => void;
}

const ConfigChangeContext = createContext<ConfigChangeContextValue | null>(
  null,
);

export function useConfigChange(): ConfigChangeContextValue {
  const ctx = useContext(ConfigChangeContext);
  if (ctx == null) {
    throw new Error("useConfigChange must be used within ConfigChangeProvider");
  }
  return ctx;
}

// --- Status sets ---

const STATUS_STOPPED = new Set(["FINISHED", "EXCEPTION", "ABORTED"]);

// --- Provider ---

interface ProviderProps {
  readonly children: ReactNode;
}

export function ConfigChangeProvider({ children }: ProviderProps) {
  const { token, username } = useAuthToken();
  const tokenRef = useFreshRef(token);
  const [searchParams] = useSearchParams();
  const [state, dispatch] = useReducer(configChangeReducer, initialState);

  // Refs for repo job tracking (shared with socket hook)
  const repoJobIdRef = useRef<number | null>(null);
  const stoppedRepoJobs = useRef<number[]>([]);
  const isRepoRefreshingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Socket
  useConfigChangeSocket(token, username, dispatch, {
    repoJobIdRef,
    stoppedRepoJobs,
    isRepoRefreshingRef,
  });

  // Commit target from URL params
  const commitTarget = useMemo((): CommitTarget => {
    const hostname = searchParams.get("hostname");
    if (hostname) return { hostname };
    const group = searchParams.get("group");
    if (group) return { group };
    return { all: true };
  }, [searchParams]);

  // Derived state
  const dryRun = useMemo(
    () => deriveDryRun(state.dryRunProgressData),
    [state.dryRunProgressData],
  );
  const liveRun = useMemo(
    () => deriveLiveRun(state.liveRunProgressData),
    [state.liveRunProgressData],
  );
  const confirmRun = useMemo(
    () => deriveConfirmRun(state.confirmRunProgressData),
    [state.confirmRunProgressData],
  );

  // Repo job refs are mutated synchronously by socket events and read here
  // for display purposes. Converting to state would break the synchronous
  // read/write pattern the socket handler relies on.
  /* eslint-disable react-hooks/refs */
  const allRepoJobs = useMemo(() => {
    const jobs = [...stoppedRepoJobs.current];
    if (repoJobIdRef.current != null) {
      jobs.push(repoJobIdRef.current);
    }
    return jobs;
  }, [state]); // re-derive when state changes (side effect of repo job tracking)
  /* eslint-enable react-hooks/refs */

  // --- Polling ---

  const updateJobType = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jobType: string, payload: any) => {
      switch (jobType) {
        case "dry_run":
          dispatch({ type: actions.SET_DRY_RUN_PROGRESS, data: payload });
          break;
        case "live_run":
          dispatch({ type: actions.SET_LIVE_RUN_PROGRESS, data: payload });
          break;
        case "confirm_run":
          dispatch({ type: actions.SET_CONFIRM_RUN_PROGRESS, data: payload });
          break;
        default:
          throw new Error("pollJobStatus called with unknown jobtype");
      }
    },
    [],
  );

  const pollJobStatusRef = useRef<(jobId: number, jobType: string) => void>();

  const pollJobStatus = useCallback(
    (jobId: number, jobType: string) => {
      const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: true });

      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await getData(url, tokenRef.current);
          const payload = response.data.jobs[0];
          updateJobType(jobType, payload);

          if (STATUS_STOPPED.has(payload.status)) {
            clearInterval(pollIntervalRef.current ?? undefined);
            pollIntervalRef.current = null;
            dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });

            if (
              jobType === "live_run" &&
              payload.status === "FINISHED" &&
              typeof payload.next_job_id === "number"
            ) {
              pollJobStatusRef.current?.(payload.next_job_id, "confirm_run");
            }
            if (jobType === "live_run") {
              dispatch({ type: actions.SET_SYNCTO_FORCE, force: false });
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(pollIntervalRef.current ?? undefined);
          pollIntervalRef.current = null;
          dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
        }
      }, 1000);
    },
    [tokenRef, updateJobType],
  );

  useEffect(() => {
    pollJobStatusRef.current = pollJobStatus;
  }, [pollJobStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // --- Named actions ---

  const loadDevicesAndHistory = useCallback(async () => {
    const [devices, syncHistory] = await Promise.all([
      fetchDeviceList(tokenRef.current, commitTarget),
      fetchSyncHistory(tokenRef.current),
    ]);
    dispatch({ type: actions.SET_DEVICES, devices });
    dispatch({ type: actions.SET_SYNC_HISTORY, syncHistory });
  }, [tokenRef, commitTarget]);

  const deviceSyncStart = useCallback(
    async (options: DeviceSyncOptions = {}) => {
      const syncOptions: DeviceSyncOptions = {
        ...options,
        force: state.synctoForce || undefined,
      };

      const result = await startDeviceSync(
        tokenRef.current,
        commitTarget,
        syncOptions,
      );

      const isDryRun = options.dry_run ?? true;
      if (isDryRun) {
        dispatch({
          type: actions.SET_DRY_RUN_TOTAL_COUNT,
          count: result.totalCount,
        });
      } else {
        dispatch({
          type: actions.SET_LIVE_RUN_TOTAL_COUNT,
          count: result.totalCount,
        });
      }

      const pollType = isDryRun ? "dry_run" : "live_run";
      pollJobStatus(result.job_id, pollType);
      dispatch({ type: actions.SET_DRY_RUN_DISABLE, disabled: true });
    },
    [tokenRef, commitTarget, state.synctoForce, pollJobStatus],
  );

  const handleDryRunReady = useCallback(() => {
    const element = document.getElementById("dryrunButton");
    element?.scrollIntoView({ block: "start", behavior: "smooth" });
    deviceSyncStart({ resync: false });
  }, [deviceSyncStart]);

  const handleRepoRefreshing = useCallback(
    async (isRefreshing: boolean) => {
      if (isRepoRefreshingRef.current && !isRefreshing) {
        await loadDevicesAndHistory();
      } else if (!repoJobIdRef.current) {
        repoJobIdRef.current = -1;
      }
      isRepoRefreshingRef.current = isRefreshing;
    },
    [loadDevicesAndHistory],
  );

  const resetState = useCallback(async () => {
    dispatch({ type: actions.RESET_STATE });
    stoppedRepoJobs.current = [];
    repoJobIdRef.current = null;
    isRepoRefreshingRef.current = false;
    await loadDevicesAndHistory();
  }, [loadDevicesAndHistory]);

  const setSynctoForce = useCallback((force: boolean) => {
    dispatch({ type: actions.SET_SYNCTO_FORCE, force });
  }, []);

  // --- Initial load ---

  useEffect(() => {
    loadDevicesAndHistory();
  }, [loadDevicesAndHistory]);

  // scrollTo and autoDryRun from URL
  useEffect(() => {
    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo != null) {
      const element = document.getElementById(`${scrollTo}_section`);
      element?.scrollIntoView({ behavior: "smooth" });
    }

    if (searchParams.get("autoDryRun")) {
      handleDryRunReady();
    }
    // Only run on mount
  }, []);

  // onbeforeunload
  useEffect(() => {
    if (state.blockNavigation) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
  }, [state.blockNavigation]);

  /* eslint-disable react-hooks/refs -- see allRepoJobs comment above */
  const value = useMemo(
    (): ConfigChangeContextValue => ({
      state,
      dryRun,
      liveRun,
      confirmRun,
      allRepoJobs,
      commitTarget,
      isRepoRefreshing: isRepoRefreshingRef.current,
      deviceSyncStart,
      handleRepoRefreshing,
      handleDryRunReady,
      resetState,
      setSynctoForce,
    }),
    [
      state,
      dryRun,
      liveRun,
      confirmRun,
      allRepoJobs,
      commitTarget,
      deviceSyncStart,
      handleRepoRefreshing,
      handleDryRunReady,
      resetState,
      setSynctoForce,
    ],
  );

  return (
    <ConfigChangeContext.Provider value={value}>
      {children}
    </ConfigChangeContext.Provider>
  );
  /* eslint-enable react-hooks/refs */
}
