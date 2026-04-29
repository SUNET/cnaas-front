// --- Types ---

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

export interface DryRunProgress {
  readonly id?: number;
  readonly status?: string;
  readonly change_score?: string;
  readonly result?: { devices: Record<string, unknown> };
}

export interface LiveRunProgress {
  readonly id?: number;
  readonly status?: string;
  readonly next_job_id?: number;
  readonly result?: { devices: string };
}

export interface ConfirmRunProgress {
  readonly id?: number;
  readonly status?: string;
}

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
  | { type: typeof actions.RESET_STATE };

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

    case actions.RESET_STATE:
      return { ...initialState };

    default:
      return state;
  }
}
