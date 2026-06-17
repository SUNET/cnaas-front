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
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { useFreshRef } from "../../../hooks/useFreshRef";
import { useBeforeUnloadWarning } from "../../../hooks/useBeforeUnloadWarning";
import {
  fetchDeviceList,
  fetchJobStatus,
  fetchSyncHistory,
  startDeviceSync,
  type DeviceSyncOptions,
} from "../api/configChangeApi";
import {
  configChangeReducer,
  initialState,
  actions,
  type ConfigChangeState,
  type CommitTarget,
} from "./configChangeReducer";
import {
  isDevicesJobResult,
  isLiveRunResult,
  type DeviceResult,
  type Job,
} from "../../../types/job";
import { useConfigChangeSocket } from "../hooks/useConfigChangeSocket";

// --- Derived state ---

export type DryRunState = {
  readonly status: string;
  readonly results: Readonly<Record<string, DeviceResult>>;
  readonly changeScore: number | null;
  readonly jobId: number | string;
};

export type LiveRunState = {
  readonly status: string;
  readonly results: string;
  readonly jobId: number | string;
};

export type ConfirmRunState = {
  readonly status: string;
  readonly jobId: number | string;
};

function deriveDryRun(job: Job | null): DryRunState {
  if (job == null) {
    return { status: "", results: {}, changeScore: null, jobId: "NA" };
  }
  const results =
    job.status === "FINISHED" && isDevicesJobResult(job.result)
      ? job.result.devices
      : {};
  return {
    status: job.status,
    changeScore: job.change_score,
    jobId: job.id,
    results,
  };
}

function deriveLiveRun(job: Job | null): LiveRunState {
  if (job == null) {
    return { status: "", results: "", jobId: "NA" };
  }
  const results =
    job.status === "FINISHED" && isLiveRunResult(job.result)
      ? job.result.devices
      : "";
  return {
    status: job.status,
    jobId: job.id,
    results,
  };
}

function deriveConfirmRun(job: Job | null): ConfirmRunState {
  if (job == null) {
    return { status: "", jobId: "NA" };
  }
  return {
    status: job.status,
    jobId: job.id,
  };
}

// --- Context shape ---

type ConfigChangeContextValue = {
  readonly state: ConfigChangeState;
  readonly dryRun: DryRunState;
  readonly liveRun: LiveRunState;
  readonly confirmRun: ConfirmRunState;
  readonly allRepoJobs: number[];
  readonly commitTarget: CommitTarget;
  readonly isRepoRefreshing: boolean;
  readonly deviceSyncStart: (options?: DeviceSyncOptions) => Promise<void>;
  readonly handleRepoRefreshing: (isRefreshing: boolean) => Promise<void>;
  readonly handleDryRunReady: () => void;
  readonly resetState: () => Promise<void>;
  readonly setSynctoForce: (force: boolean) => void;
};

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

// --- Provider ---

type ProviderProps = {
  readonly children: ReactNode;
};

export function ConfigChangeProvider({ children }: ProviderProps) {
  const { token, username } = useAuthToken();
  const tokenRef = useFreshRef(token);
  const [searchParams] = useSearchParams();
  const [state, dispatch] = useReducer(configChangeReducer, initialState);

  // Polling AbortController — genuinely a ref (imperative resource, not state)
  const pollAbortRef = useRef<AbortController | null>(null);

  // Socket
  useConfigChangeSocket(token, username, dispatch, {
    repoJobId: state.repoJobId,
    stoppedRepoJobs: state.stoppedRepoJobs,
    isRepoRefreshing: state.isRepoRefreshing,
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

  // Repo job IDs to display in the log filter — derived from reducer state
  const allRepoJobs = useMemo(() => {
    const jobs = [...state.stoppedRepoJobs];
    if (state.repoJobId != null) {
      jobs.push(state.repoJobId);
    }
    return jobs;
  }, [state.repoJobId, state.stoppedRepoJobs]);

  // --- Polling ---

  type JobType = "dry_run" | "live_run" | "confirm_run";

  const POLL_INTERVAL_MS = 1000;

  const dispatchProgress = useCallback((jobType: JobType, payload: Job) => {
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
      default: {
        const exhaustive: never = jobType;
        throw new Error(`Unknown jobtype: ${exhaustive}`);
      }
    }
  }, []);

  // Poll a single job until it stops or is aborted. Returns the final payload
  // so callers can chain (e.g. live_run → confirm_run).
  const pollUntilStopped = useCallback(
    async (
      jobId: number,
      jobType: JobType,
      signal: AbortSignal,
    ): Promise<Job | null> => {
      while (!signal.aborted) {
        const { payload, stopped } = await fetchJobStatus(
          jobId,
          tokenRef.current,
          signal,
        );
        if (signal.aborted) return null;
        dispatchProgress(jobType, payload);
        if (stopped) return payload;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      return null;
    },
    [tokenRef, dispatchProgress],
  );

  const startPolling = useCallback(
    (jobId: number, jobType: JobType) => {
      pollAbortRef.current?.abort();
      const controller = new AbortController();
      pollAbortRef.current = controller;
      const { signal } = controller;

      dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: true });

      (async () => {
        try {
          const finalPayload = await pollUntilStopped(jobId, jobType, signal);
          if (signal.aborted || finalPayload == null) return;

          if (jobType === "live_run") {
            dispatch({ type: actions.SET_SYNCTO_FORCE, force: false });

            // Chain confirm_run when live_run finishes successfully with a follow-up job.
            if (
              finalPayload.status === "FINISHED" &&
              typeof finalPayload.next_job_id === "number"
            ) {
              await pollUntilStopped(
                finalPayload.next_job_id,
                "confirm_run",
                signal,
              );
            }
          }
        } catch (error) {
          if (signal.aborted) return;
          console.error("Polling error:", error);
        } finally {
          if (!signal.aborted) {
            dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
          }
        }
      })();
    },
    [pollUntilStopped],
  );

  // Abort any in-flight polling on unmount
  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
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
      startPolling(result.job_id, pollType);
      dispatch({ type: actions.SET_DRY_RUN_DISABLE, disabled: true });
    },
    [tokenRef, commitTarget, state.synctoForce, startPolling],
  );

  const handleDryRunReady = useCallback(() => {
    const element = document.getElementById("dryrunButton");
    element?.scrollIntoView({ block: "start", behavior: "smooth" });
    deviceSyncStart({ resync: false });
  }, [deviceSyncStart]);

  const handleRepoRefreshing = useCallback(
    async (isRefreshing: boolean) => {
      if (state.isRepoRefreshing && !isRefreshing) {
        await loadDevicesAndHistory();
      }
      // The sentinel-plant (repoJobId -1) lives in the reducer's
      // SET_REPO_REFRESHING handler so it reads the *current* repoJobId and
      // can't clobber a real id adopted from a socket event in the meantime.
      dispatch({ type: actions.SET_REPO_REFRESHING, refreshing: isRefreshing });
    },
    [state.isRepoRefreshing, loadDevicesAndHistory],
  );

  const resetState = useCallback(async () => {
    dispatch({ type: actions.RESET_STATE });
    await loadDevicesAndHistory();
  }, [loadDevicesAndHistory]);

  const setSynctoForce = useCallback((force: boolean) => {
    dispatch({ type: actions.SET_SYNCTO_FORCE, force });
  }, []);

  // --- Initial load ---

  useEffect(() => {
    loadDevicesAndHistory();
  }, [loadDevicesAndHistory]);

  // scrollTo and autoDryRun from URL — read once on mount.
  // Use a fresh ref for `handleDryRunReady` so we always invoke the latest
  // version without re-running the effect on every render.
  const handleDryRunReadyRef = useFreshRef(handleDryRunReady);
  useEffect(() => {
    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo != null) {
      const element = document.getElementById(`${scrollTo}_section`);
      element?.scrollIntoView({ behavior: "smooth" });
    }

    if (searchParams.get("autoDryRun")) {
      handleDryRunReadyRef.current();
    }
    // searchParams is intentionally only consumed on mount; subsequent URL
    // changes should not retrigger scrolling or auto-dry-run.
  }, []);

  // Warn before unloading the browser tab while a job is running.
  // In-app router navigation is handled separately by <NavigationBlocker>.
  useBeforeUnloadWarning(state.blockNavigation);

  const value = useMemo(
    (): ConfigChangeContextValue => ({
      state,
      dryRun,
      liveRun,
      confirmRun,
      allRepoJobs,
      commitTarget,
      isRepoRefreshing: state.isRepoRefreshing,
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
}
