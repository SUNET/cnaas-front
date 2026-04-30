// --- Types ---

export interface JobTask {
  readonly task_name: string;
  readonly result: string | undefined;
  readonly failed: boolean;
  readonly diff: string;
}

export interface Device {
  readonly hostname: string;
  readonly synchronized: boolean;
  readonly state: string;
}

export interface SyncHistory {
  readonly [hostname: string]: unknown;
}

export interface CommitTarget {
  readonly hostname?: string;
  readonly group?: string;
  readonly all?: true;
}

export interface JobProgress {
  readonly id?: number;
  readonly status?: string;
  readonly finished_devices?: string[];
  readonly start_time?: string;
  readonly finish_time?: string;
  readonly exception?: { readonly message?: string };
}

export interface DryRunProgress extends JobProgress {
  readonly change_score?: string;
  readonly result?: { devices: Record<string, { job_tasks: JobTask[] }> };
}

export interface LiveRunProgress extends JobProgress {
  readonly next_job_id?: number;
  readonly result?: { devices: string };
}

export type ConfirmRunProgress = JobProgress;

export interface ConfigChangeState {
  readonly devices: Device[];
  readonly syncHistory: SyncHistory;
  readonly blockNavigation: boolean;
  readonly dryRunDisable: boolean;
  readonly dryRunProgressData: DryRunProgress;
  readonly dryRunTotalCount: number;
  readonly liveRunProgressData: LiveRunProgress;
  readonly liveRunTotalCount: number;
  readonly confirmRunProgressData: ConfirmRunProgress;
  readonly logLines: string[];
  readonly synctoForce: boolean;
  readonly isRepoRefreshing: boolean;
  readonly repoJobId: number | null;
  readonly stoppedRepoJobs: readonly number[];
}

// --- Action types ---

export const actions = {
  SET_DEVICES: "SET_DEVICES",
  SET_SYNC_HISTORY: "SET_SYNC_HISTORY",
  SET_BLOCK_NAVIGATION: "SET_BLOCK_NAVIGATION",
  SET_DRY_RUN_DISABLE: "SET_DRY_RUN_DISABLE",
  SET_DRY_RUN_PROGRESS: "SET_DRY_RUN_PROGRESS",
  SET_DRY_RUN_TOTAL_COUNT: "SET_DRY_RUN_TOTAL_COUNT",
  SET_LIVE_RUN_PROGRESS: "SET_LIVE_RUN_PROGRESS",
  SET_LIVE_RUN_TOTAL_COUNT: "SET_LIVE_RUN_TOTAL_COUNT",
  SET_CONFIRM_RUN_PROGRESS: "SET_CONFIRM_RUN_PROGRESS",
  SET_SYNCTO_FORCE: "SET_SYNCTO_FORCE",
  APPEND_LOG: "APPEND_LOG",
  RESET_STATE: "RESET_STATE",
  SET_REPO_REFRESHING: "SET_REPO_REFRESHING",
  SET_REPO_JOB_ID: "SET_REPO_JOB_ID",
  REPO_JOB_STOPPED: "REPO_JOB_STOPPED",
} as const;

export type Action =
  | { type: typeof actions.SET_DEVICES; devices: Device[] }
  | { type: typeof actions.SET_SYNC_HISTORY; syncHistory: SyncHistory }
  | { type: typeof actions.SET_BLOCK_NAVIGATION; blocked: boolean }
  | { type: typeof actions.SET_DRY_RUN_DISABLE; disabled: boolean }
  | { type: typeof actions.SET_DRY_RUN_PROGRESS; data: DryRunProgress }
  | { type: typeof actions.SET_DRY_RUN_TOTAL_COUNT; count: number }
  | { type: typeof actions.SET_LIVE_RUN_PROGRESS; data: LiveRunProgress }
  | { type: typeof actions.SET_LIVE_RUN_TOTAL_COUNT; count: number }
  | { type: typeof actions.SET_CONFIRM_RUN_PROGRESS; data: ConfirmRunProgress }
  | { type: typeof actions.SET_SYNCTO_FORCE; force: boolean }
  | { type: typeof actions.APPEND_LOG; line: string }
  | { type: typeof actions.RESET_STATE }
  | { type: typeof actions.SET_REPO_REFRESHING; refreshing: boolean }
  | { type: typeof actions.SET_REPO_JOB_ID; jobId: number | null }
  | { type: typeof actions.REPO_JOB_STOPPED };

// --- Initial state ---

export const initialState: ConfigChangeState = {
  devices: [],
  syncHistory: {},
  blockNavigation: false,
  dryRunDisable: false,
  dryRunProgressData: {},
  dryRunTotalCount: 0,
  liveRunProgressData: {},
  liveRunTotalCount: 0,
  confirmRunProgressData: {},
  logLines: [],
  synctoForce: false,
  isRepoRefreshing: false,
  repoJobId: null,
  stoppedRepoJobs: [],
};

// --- Reducer ---

const MAX_LOG_LINES = 1000;

export function configChangeReducer(
  state: ConfigChangeState,
  action: Action,
): ConfigChangeState {
  switch (action.type) {
    case actions.SET_DEVICES:
      return { ...state, devices: action.devices };

    case actions.SET_SYNC_HISTORY:
      return { ...state, syncHistory: action.syncHistory };

    case actions.SET_BLOCK_NAVIGATION:
      return { ...state, blockNavigation: action.blocked };

    case actions.SET_DRY_RUN_DISABLE:
      return { ...state, dryRunDisable: action.disabled };

    case actions.SET_DRY_RUN_PROGRESS:
      return { ...state, dryRunProgressData: action.data };

    case actions.SET_DRY_RUN_TOTAL_COUNT:
      return { ...state, dryRunTotalCount: action.count };

    case actions.SET_LIVE_RUN_PROGRESS:
      return { ...state, liveRunProgressData: action.data };

    case actions.SET_LIVE_RUN_TOTAL_COUNT:
      return { ...state, liveRunTotalCount: action.count };

    case actions.SET_CONFIRM_RUN_PROGRESS:
      return { ...state, confirmRunProgressData: action.data };

    case actions.SET_SYNCTO_FORCE:
      return { ...state, synctoForce: action.force };

    case actions.APPEND_LOG: {
      const logLines = [...state.logLines, action.line];
      if (logLines.length > MAX_LOG_LINES) {
        logLines.shift();
      }
      return { ...state, logLines };
    }

    case actions.SET_REPO_REFRESHING:
      return { ...state, isRepoRefreshing: action.refreshing };

    case actions.SET_REPO_JOB_ID:
      return { ...state, repoJobId: action.jobId };

    case actions.REPO_JOB_STOPPED:
      return state.repoJobId != null
        ? {
            ...state,
            stoppedRepoJobs: [...state.stoppedRepoJobs, state.repoJobId],
            repoJobId: null,
          }
        : state;

    case actions.RESET_STATE:
      return { ...initialState };

    default:
      return state;
  }
}
