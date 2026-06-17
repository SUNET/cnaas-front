// --- Types ---

import type { Device } from "../../../types/device";
import type { Job } from "../../../types/job";
import type { SyncHistory } from "../../../types/syncHistory";

export type SyncTargetDevice = Pick<
  Device,
  "hostname" | "synchronized" | "state"
>;

export type CommitTarget = {
  readonly hostname?: string;
  readonly group?: string;
  readonly all?: true;
};

export type ConfigChangeState = {
  readonly devices: SyncTargetDevice[];
  readonly syncHistory: SyncHistory;
  readonly blockNavigation: boolean;
  readonly dryRunDisable: boolean;
  readonly dryRunProgressData: Job | null;
  readonly dryRunTotalCount: number;
  readonly liveRunProgressData: Job | null;
  readonly liveRunTotalCount: number;
  readonly confirmRunProgressData: Job | null;
  readonly logLines: string[];
  readonly synctoForce: boolean;
  readonly isRepoRefreshing: boolean;
  readonly repoJobId: number | null;
  readonly stoppedRepoJobs: readonly number[];
};

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
  | { type: typeof actions.SET_DEVICES; devices: SyncTargetDevice[] }
  | { type: typeof actions.SET_SYNC_HISTORY; syncHistory: SyncHistory }
  | { type: typeof actions.SET_BLOCK_NAVIGATION; blocked: boolean }
  | { type: typeof actions.SET_DRY_RUN_DISABLE; disabled: boolean }
  | { type: typeof actions.SET_DRY_RUN_PROGRESS; data: Job | null }
  | { type: typeof actions.SET_DRY_RUN_TOTAL_COUNT; count: number }
  | { type: typeof actions.SET_LIVE_RUN_PROGRESS; data: Job | null }
  | { type: typeof actions.SET_LIVE_RUN_TOTAL_COUNT; count: number }
  | { type: typeof actions.SET_CONFIRM_RUN_PROGRESS; data: Job | null }
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
  dryRunProgressData: null,
  dryRunTotalCount: 0,
  liveRunProgressData: null,
  liveRunTotalCount: 0,
  confirmRunProgressData: null,
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
      return {
        ...state,
        isRepoRefreshing: action.refreshing,
        // Plant the sentinel only when a refresh *begins* and no job id is
        // known yet. -1 marks "ours, awaiting the real job_id from a socket
        // RUNNING event". Deciding this here (from current state) rather than
        // in a component closure is what prevents an already-adopted real id
        // from being clobbered back to -1.
        repoJobId:
          action.refreshing && state.repoJobId == null ? -1 : state.repoJobId,
      };

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
