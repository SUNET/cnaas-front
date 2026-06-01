import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { useFreshRef } from "../../hooks/useFreshRef";
import { useBeforeUnloadWarning } from "../../hooks/useBeforeUnloadWarning";
import { getData } from "../../utils/getData";
import { post, putData } from "../../utils/sendData";
import { isTerminalJobStatus, type Job } from "../../types/job";
import type { CommitTarget } from "./firmwareUpgradeApi";
import {
  actions,
  firmwareUpgradeReducer,
  initialState,
} from "./firmwareUpgradeReducer";
import { useFirmwareUpgradeSocket } from "./useFirmwareUpgradeSocket";

/**
 * Body of POST /firmware/upgrade. On success `job_id` is set; most validation
 * errors come back as HTTP 200 with `{ status: "error", message }` and no
 * `job_id` (cnaas-nms firmware.py FirmwareUpgradeApi.post via empty_result).
 */
type UpgradeStartResult = {
  readonly status?: string;
  readonly message?: string;
  readonly job_id?: number;
};

// --- Derived view groups ---

type StepProgress = {
  readonly jobId: number | null;
  readonly jobData: Job | null;
  readonly totalCount: number;
};

// --- Context shape ---

type FirmwareUpgradeContextValue = {
  readonly step2: StepProgress;
  readonly step3: StepProgress;
  readonly logLines: readonly string[];
  readonly filename: string | null;
  readonly activateStep3: boolean;
  readonly blockNavigation: boolean;
  readonly startError: string | null;
  readonly commitTarget: CommitTarget;
  readonly commitTargetName: string;
  readonly updateComment: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly updateTicketRef: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly skipStep2: () => void;
  readonly firmwareUpgradeStart: (
    step: number,
    filename: string | null,
    startAt: string | null,
    staggeredUpgrade?: boolean,
  ) => Promise<void>;
  readonly firmwareUpgradeAbort: (step: number) => Promise<void>;
};

const FirmwareUpgradeContext =
  createContext<FirmwareUpgradeContextValue | null>(null);

export function useFirmwareUpgrade(): FirmwareUpgradeContextValue {
  const ctx = useContext(FirmwareUpgradeContext);
  if (ctx == null) {
    throw new Error(
      "useFirmwareUpgrade must be used within FirmwareUpgradeProvider",
    );
  }
  return ctx;
}

// --- Helpers ---

function commitTargetToName(target: CommitTarget): string {
  if (target.hostname) {
    return `hostname: ${target.hostname}`;
  }
  if (target.group) {
    return `group: ${target.group}`;
  }
  return "unknown";
}

const POLL_INTERVAL_MS = 5000;

// --- Provider ---

type ProviderProps = {
  readonly children: ReactNode;
};

export function FirmwareUpgradeProvider({ children }: ProviderProps) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);
  const [searchParams] = useSearchParams();

  const [state, dispatch] = useReducer(firmwareUpgradeReducer, initialState);
  const {
    blockNavigation,
    step2TotalCount,
    step2JobId,
    step2JobData,
    step3TotalCount,
    step3JobId,
    step3JobData,
    activateStep3,
    filename,
    jobComment,
    jobTicketRef,
    logLines,
    startError,
  } = state;

  // Derived view state — never stored in the reducer.
  const step2jobStatus = step2JobData?.status ?? null;
  const step3jobStatus = step3JobData?.status ?? null;

  // Stream backend log events into the reducer's log buffer.
  useFirmwareUpgradeSocket(token, dispatch);

  // Commit target from URL params. Returns `{}` (not null) so callers can
  // spread it unconditionally into request bodies.
  const commitTarget = useMemo((): CommitTarget => {
    const hostname = searchParams.get("hostname");
    if (hostname) return { hostname };
    const group = searchParams.get("group");
    if (group) return { group };
    return {};
  }, [searchParams]);

  // --- Polling ---
  //
  // A single AbortController owns the in-flight poll loop. `blockNavigation` is
  // toggled in exactly one place: true when a poll starts, false in `finally`.
  const pollAbortRef = useRef<AbortController | null>(null);

  const pollJobStatus = async (
    jobId: number,
    step: number,
    signal: AbortSignal,
  ): Promise<void> => {
    const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;
    while (!signal.aborted) {
      const data = await getData(url, tokenRef.current, signal);
      if (signal.aborted) return;
      const jobData: Job = data.data.jobs[0];
      if (step === 2) {
        dispatch({ type: actions.SET_STEP2_JOB_DATA, data: jobData });
      } else {
        dispatch({ type: actions.SET_STEP3_JOB_DATA, data: jobData });
      }
      if (isTerminalJobStatus(jobData.status)) {
        if (step === 2) {
          dispatch({ type: actions.SET_ACTIVATE_STEP3, activate: true });
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  };

  const startPolling = (jobId: number, step: number): void => {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    const { signal } = controller;

    dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: true });

    (async () => {
      try {
        await pollJobStatus(jobId, step, signal);
      } catch (error) {
        if (signal.aborted) return;
        console.error("Polling error:", error);
      } finally {
        if (!signal.aborted) {
          dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
        }
      }
    })();
  };

  // Abort any in-flight polling on unmount.
  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  // Warn before unloading the browser tab while a job is running. In-app router
  // navigation is handled separately by <NavigationBlocker>.
  useBeforeUnloadWarning(blockNavigation);

  // --- Named actions ---

  const updateComment = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: actions.SET_JOB_COMMENT, comment: e.target.value });
  };

  const updateTicketRef = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: actions.SET_JOB_TICKET_REF, ticketRef: e.target.value });
  };

  const skipStep2 = () => {
    dispatch({ type: actions.SET_ACTIVATE_STEP3, activate: true });
  };

  const readHeaders = (response: Response, step: number): void => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !Number.isNaN(Number(totalCountHeader))) {
      if (step === 2) {
        dispatch({
          type: actions.SET_STEP2_TOTAL_COUNT,
          count: Number.parseInt(totalCountHeader, 10),
        });
      } else if (step === 3) {
        dispatch({
          type: actions.SET_STEP3_TOTAL_COUNT,
          count: Number.parseInt(totalCountHeader, 10),
        });
      }
    } else {
      console.log(
        "Could not find X-Total-Count header, progress bar will not work",
      );
    }
  };

  const firmwareUpgradeStart = async (
    step: number,
    filename: string | null,
    startAt: string | null,
    staggeredUpgrade?: boolean,
  ): Promise<void> => {
    if (step !== 2 && step !== 3) {
      throw "Invalid argument passed to firmwareUpgradeStart";
    }

    const baseUrl =
      process.env.FIRMWARE_URL &&
      typeof process.env.FIRMWARE_URL === "string" &&
      process.env.FIRMWARE_URL.startsWith("http")
        ? process.env.FIRMWARE_URL
        : `${process.env.API_URL}/firmware/`;

    const dataToSend = {
      ...commitTarget,
      url: baseUrl,
      comment: jobComment,
      ticket_ref: jobTicketRef,
      ...(step === 2 && {
        activate: true,
        download: true,
        filename,
        pre_flight: true,
      }),
      ...(step === 3 && {
        post_flight: true,
        reboot: true,
      }),
      ...(startAt && { start_at: startAt }),
      ...(staggeredUpgrade && { staggered_upgrade: staggeredUpgrade }),
    };

    if (step === 2) {
      dispatch({ type: actions.SET_FILENAME, filename });
    }

    const url = `${process.env.API_URL}/api/v1.0/firmware/upgrade`;
    const response = await post(url, token, dataToSend);
    readHeaders(response, step);
    // post() only throws on !response.ok. The BE returns most upgrade
    // validation errors as HTTP 200 with { status: "error", message } and no
    // job_id, so check the body — not just the HTTP status — and surface the
    // message instead of silently starting a poll for a missing job.
    const data: UpgradeStartResult = await response.json();
    if (data.status === "error" || data.job_id == null) {
      dispatch({
        type: actions.SET_START_ERROR,
        message: data.message ?? "Failed to start firmware upgrade",
      });
      return;
    }
    dispatch({ type: actions.SET_START_ERROR, message: null });
    if (step === 2) {
      dispatch({ type: actions.SET_STEP2_JOB_ID, jobId: data.job_id });
    } else {
      dispatch({ type: actions.SET_STEP3_JOB_ID, jobId: data.job_id });
    }
    startPolling(data.job_id, step);
  };

  const firmwareUpgradeAbort = async (step: number): Promise<void> => {
    if (step !== 2 && step !== 3) {
      throw "Invalid argument passed to firmwareUpgradeAbort";
    }

    let jobId: number | null = null;
    if (step === 2) {
      if (step2jobStatus === "RUNNING" || step2jobStatus === "SCHEDULED") {
        jobId = step2JobId;
        dispatch({
          type: actions.APPEND_LOG,
          line: `WEBUI job #${jobId}: Trying to abort job...\n`,
        });
      } else {
        return;
      }
    }

    if (step === 3) {
      if (step3jobStatus === "RUNNING" || step3jobStatus === "SCHEDULED") {
        jobId = step3JobId;
        dispatch({
          type: actions.APPEND_LOG,
          line: `WEBUI job #${jobId}: Trying to abort job...\n`,
        });
      } else {
        return;
      }
    }

    const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;
    const dataToSend = {
      action: "ABORT",
      abort_reason: "Aborted from WebUI",
    };
    console.log(`Aborting firmware upgrade job ${jobId} step ${step}`);
    const response = await putData(url, token, dataToSend);
    readHeaders(response, step);
  };

  const value: FirmwareUpgradeContextValue = {
    step2: {
      jobId: step2JobId,
      jobData: step2JobData,
      totalCount: step2TotalCount,
    },
    step3: {
      jobId: step3JobId,
      jobData: step3JobData,
      totalCount: step3TotalCount,
    },
    logLines,
    filename,
    activateStep3,
    blockNavigation,
    startError,
    commitTarget,
    commitTargetName: commitTargetToName(commitTarget),
    updateComment,
    updateTicketRef,
    skipStep2,
    firmwareUpgradeStart,
    firmwareUpgradeAbort,
  };

  return (
    <FirmwareUpgradeContext.Provider value={value}>
      {children}
    </FirmwareUpgradeContext.Provider>
  );
}
