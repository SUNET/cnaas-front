import type { Job } from "../../types/job";

// --- Types ---

export type FirmwareUpgradeState = {
  readonly blockNavigation: boolean;
  readonly step2TotalCount: number;
  readonly step2JobId: number | null;
  readonly step2JobData: Job | null;
  readonly step3TotalCount: number;
  readonly step3JobId: number | null;
  readonly step3JobData: Job | null;
  readonly activateStep3: boolean;
  readonly filename: string | null;
  readonly jobComment: string;
  readonly jobTicketRef: string;
  readonly logLines: readonly string[];
  readonly startError: string | null;
};

// --- Action types ---

export const actions = {
  SET_BLOCK_NAVIGATION: "SET_BLOCK_NAVIGATION",
  SET_STEP2_TOTAL_COUNT: "SET_STEP2_TOTAL_COUNT",
  SET_STEP2_JOB_ID: "SET_STEP2_JOB_ID",
  SET_STEP2_JOB_DATA: "SET_STEP2_JOB_DATA",
  SET_STEP3_TOTAL_COUNT: "SET_STEP3_TOTAL_COUNT",
  SET_STEP3_JOB_ID: "SET_STEP3_JOB_ID",
  SET_STEP3_JOB_DATA: "SET_STEP3_JOB_DATA",
  SET_ACTIVATE_STEP3: "SET_ACTIVATE_STEP3",
  SET_FILENAME: "SET_FILENAME",
  SET_JOB_COMMENT: "SET_JOB_COMMENT",
  SET_JOB_TICKET_REF: "SET_JOB_TICKET_REF",
  APPEND_LOG: "APPEND_LOG",
  SET_START_ERROR: "SET_START_ERROR",
} as const;

export type Action =
  | { type: typeof actions.SET_BLOCK_NAVIGATION; blocked: boolean }
  | { type: typeof actions.SET_STEP2_TOTAL_COUNT; count: number }
  | { type: typeof actions.SET_STEP2_JOB_ID; jobId: number | null }
  | { type: typeof actions.SET_STEP2_JOB_DATA; data: Job | null }
  | { type: typeof actions.SET_STEP3_TOTAL_COUNT; count: number }
  | { type: typeof actions.SET_STEP3_JOB_ID; jobId: number | null }
  | { type: typeof actions.SET_STEP3_JOB_DATA; data: Job | null }
  | { type: typeof actions.SET_ACTIVATE_STEP3; activate: boolean }
  | { type: typeof actions.SET_FILENAME; filename: string | null }
  | { type: typeof actions.SET_JOB_COMMENT; comment: string }
  | { type: typeof actions.SET_JOB_TICKET_REF; ticketRef: string }
  | { type: typeof actions.APPEND_LOG; line: string }
  | { type: typeof actions.SET_START_ERROR; message: string | null };

// --- Initial state ---

export const initialState: FirmwareUpgradeState = {
  blockNavigation: false,
  step2TotalCount: 0,
  step2JobId: null,
  step2JobData: null,
  step3TotalCount: 0,
  step3JobId: null,
  step3JobData: null,
  activateStep3: false,
  filename: null,
  jobComment: "",
  jobTicketRef: "",
  logLines: [],
  startError: null,
};

// --- Reducer ---

const MAX_LOG_LINES = 1000;

export function firmwareUpgradeReducer(
  state: FirmwareUpgradeState,
  action: Action,
): FirmwareUpgradeState {
  switch (action.type) {
    case actions.SET_BLOCK_NAVIGATION:
      return { ...state, blockNavigation: action.blocked };

    case actions.SET_STEP2_TOTAL_COUNT:
      return { ...state, step2TotalCount: action.count };

    case actions.SET_STEP2_JOB_ID:
      return { ...state, step2JobId: action.jobId };

    case actions.SET_STEP2_JOB_DATA:
      return { ...state, step2JobData: action.data };

    case actions.SET_STEP3_TOTAL_COUNT:
      return { ...state, step3TotalCount: action.count };

    case actions.SET_STEP3_JOB_ID:
      return { ...state, step3JobId: action.jobId };

    case actions.SET_STEP3_JOB_DATA:
      return { ...state, step3JobData: action.data };

    case actions.SET_ACTIVATE_STEP3:
      return { ...state, activateStep3: action.activate };

    case actions.SET_FILENAME:
      return { ...state, filename: action.filename };

    case actions.SET_JOB_COMMENT:
      return { ...state, jobComment: action.comment };

    case actions.SET_JOB_TICKET_REF:
      return { ...state, jobTicketRef: action.ticketRef };

    case actions.APPEND_LOG: {
      const logLines = [...state.logLines, action.line];
      if (logLines.length >= MAX_LOG_LINES) {
        logLines.shift();
      }
      return { ...state, logLines };
    }

    case actions.SET_START_ERROR:
      return { ...state, startError: action.message };

    default:
      return state;
  }
}
