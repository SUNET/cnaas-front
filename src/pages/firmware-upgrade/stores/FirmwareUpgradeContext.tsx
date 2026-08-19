import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { useFreshRef } from "../../../hooks/useFreshRef";
import { useBeforeUnloadWarning } from "../../../hooks/useBeforeUnloadWarning";
import { getData } from "../../../utils/getData";
import { post, putData } from "../../../utils/sendData";
import {
  extractErrorMessage,
  extractErrorMessageAsync,
} from "../../../utils/extractErrorMessage";
import { isTerminalJobStatus, type Job } from "../../../types/job";
import { archForModel, type DeviceArch } from "../../../types/device";
import {
  fetchDeviceOsVersion,
  fetchGroupOsVersion,
  type CommitTarget,
} from "../api/firmwareUpgradeApi";
import {
  actions,
  firmwareUpgradeReducer,
  initialState,
  type FirmwareInfo,
} from "./firmwareUpgradeReducer";
import { useFirmwareUpgradeSocket } from "../hooks/useFirmwareUpgradeSocket";

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

/** The firmware-upgrade steps that run a backend job (step 1 is read-only). */
type FirmwareJobStep = 2 | 3;

/**
 * Response body from `PUT /api/v1.0/job/{id}` with `{ action: "ABORT" }`.
 * On success the envelope carries the updated job (now `ABORTING`); on failure
 * it carries an error message instead of a job_id.
 */
type AbortJobResult =
  | { readonly status: "success"; readonly data: { readonly jobs: Job[] } }
  | { readonly status: "error"; readonly message?: string };

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
  /**
   * Current OS version info for the target (single device or group), fetched
   * once here and read by every step. `null` until loaded.
   */
  readonly firmwareInfo: FirmwareInfo;
  /**
   * Architecture of a single-device target, used to filter firmware options.
   * `null` for group targets (no single model) — those are left unfiltered.
   */
  readonly targetArch: DeviceArch | null;
  readonly updateComment: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly updateTicketRef: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly skipStep2: () => void;
  readonly firmwareUpgradeStart: (
    step: FirmwareJobStep,
    filename: string | null,
    startAt: string | null,
    staggeredUpgrade?: boolean,
  ) => Promise<void>;
  readonly firmwareUpgradeAbort: (step: FirmwareJobStep) => Promise<void>;
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
    firmwareInfo,
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

  // Fresh refs for the comment/ticket inputs so `firmwareUpgradeStart` can stay
  // stable across keystrokes (it reads the latest values without listing them
  // as deps, which would otherwise rebuild the memoized context value on every
  // character typed).
  const jobCommentRef = useFreshRef(jobComment);
  const jobTicketRefRef = useFreshRef(jobTicketRef);

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

  // Current OS version info for the target, fetched once here into the reducer
  // and shared with every step.
  useEffect(() => {
    const { hostname, group } = commitTarget;
    if (!hostname && !group) {
      dispatch({ type: actions.SET_FIRMWARE_INFO, info: null });
      return;
    }
    const controller = new AbortController();
    const fetchFirmwareInfo = async () => {
      try {
        let info: FirmwareInfo = null;
        if (hostname) {
          info = await fetchDeviceOsVersion(
            hostname,
            tokenRef.current,
            controller.signal,
          );
        } else if (group) {
          info = await fetchGroupOsVersion(
            group,
            tokenRef.current,
            controller.signal,
          );
        }
        dispatch({ type: actions.SET_FIRMWARE_INFO, info });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch firmware info:", error);
      }
    };
    fetchFirmwareInfo();
    return () => controller.abort();
  }, [commitTarget, tokenRef]);

  // Architecture of a single-device target, derived from its model and used to
  // filter firmware options. `null` for group targets (no single model), which
  // leaves them unfiltered.
  const targetArch = useMemo((): DeviceArch | null => {
    if (firmwareInfo && "devices" in firmwareInfo) {
      return archForModel(firmwareInfo.devices[0]?.model);
    }
    return null;
  }, [firmwareInfo]);

  // --- Polling ---
  //
  // A single AbortController owns the in-flight poll loop. `blockNavigation` is
  // toggled in exactly one place: true when a poll starts, false in `finally`.
  const pollAbortRef = useRef<AbortController | null>(null);

  const pollJobStatus = useCallback(
    async (
      jobId: number,
      step: FirmwareJobStep,
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
    },
    [tokenRef],
  );

  const startPolling = useCallback(
    (jobId: number, step: FirmwareJobStep): void => {
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
    },
    [pollJobStatus],
  );

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

  const updateComment = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: actions.SET_JOB_COMMENT, comment: e.target.value });
  }, []);

  const updateTicketRef = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: actions.SET_JOB_TICKET_REF, ticketRef: e.target.value });
  }, []);

  const skipStep2 = useCallback(() => {
    dispatch({ type: actions.SET_ACTIVATE_STEP3, activate: true });
  }, []);

  const readHeaders = useCallback(
    (response: Response, step: FirmwareJobStep): void => {
      const totalCountHeader = response.headers.get("X-Total-Count");
      if (
        totalCountHeader !== null &&
        !Number.isNaN(Number(totalCountHeader))
      ) {
        if (step === 2) {
          dispatch({
            type: actions.SET_STEP2_TOTAL_COUNT,
            count: Number.parseInt(totalCountHeader, 10),
          });
        } else {
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
    },
    [],
  );

  const firmwareUpgradeStart = useCallback(
    async (
      step: FirmwareJobStep,
      filename: string | null,
      startAt: string | null,
      staggeredUpgrade?: boolean,
    ): Promise<void> => {
      const baseUrl =
        process.env.FIRMWARE_URL &&
        typeof process.env.FIRMWARE_URL === "string" &&
        process.env.FIRMWARE_URL.startsWith("http")
          ? process.env.FIRMWARE_URL
          : `${process.env.API_URL}/firmware/`;

      const dataToSend = {
        ...commitTarget,
        url: baseUrl,
        comment: jobCommentRef.current,
        ticket_ref: jobTicketRefRef.current,
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
      // post() rejects with the raw Response on a non-2xx status. Wrap the whole
      // start flow so a transport-level failure surfaces in startError instead
      // of leaking as an unhandled rejection (the step buttons don't await this).
      try {
        const response = await post(url, tokenRef.current, dataToSend);
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
      } catch (error) {
        dispatch({
          type: actions.SET_START_ERROR,
          message: await extractErrorMessageAsync(error),
        });
      }
    },
    [
      commitTarget,
      jobCommentRef,
      jobTicketRefRef,
      tokenRef,
      readHeaders,
      startPolling,
    ],
  );

  const firmwareUpgradeAbort = useCallback(
    async (step: FirmwareJobStep): Promise<void> => {
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

      if (jobId === null) {
        return;
      }

      const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;
      const dataToSend = {
        action: "ABORT",
        abort_reason: "Aborted from WebUI",
      };
      console.log(`Aborting firmware upgrade job ${jobId} step ${step}`);
      // putData resolves to parsed JSON on 2xx, but rejects on a non-2xx status
      // (via checkJsonResponse). Handle both the in-band `{status: "error"}`
      // envelope and a thrown rejection so an abort failure always surfaces in
      // the log buffer. On success the poller reflects ABORTING -> ABORTED (the
      // returned job is dispatched here for immediate feedback).
      try {
        const result: AbortJobResult = await putData(
          url,
          tokenRef.current,
          dataToSend,
        );
        if (result.status === "error") {
          dispatch({
            type: actions.APPEND_LOG,
            line: `WEBUI job #${jobId}: abort failed: ${result.message ?? "unknown error"}\n`,
          });
          return;
        }
        const jobData = result.data.jobs[0];
        if (step === 2) {
          dispatch({ type: actions.SET_STEP2_JOB_DATA, data: jobData });
        } else {
          dispatch({ type: actions.SET_STEP3_JOB_DATA, data: jobData });
        }
      } catch (error) {
        dispatch({
          type: actions.APPEND_LOG,
          line: `WEBUI job #${jobId}: abort failed: ${extractErrorMessage(error)}\n`,
        });
      }
    },
    [step2jobStatus, step2JobId, step3jobStatus, step3JobId, tokenRef],
  );

  const value = useMemo(
    (): FirmwareUpgradeContextValue => ({
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
      firmwareInfo,
      targetArch,
      updateComment,
      updateTicketRef,
      skipStep2,
      firmwareUpgradeStart,
      firmwareUpgradeAbort,
    }),
    [
      step2JobId,
      step2JobData,
      step2TotalCount,
      step3JobId,
      step3JobData,
      step3TotalCount,
      logLines,
      filename,
      activateStep3,
      blockNavigation,
      startError,
      commitTarget,
      firmwareInfo,
      targetArch,
      updateComment,
      updateTicketRef,
      skipStep2,
      firmwareUpgradeStart,
      firmwareUpgradeAbort,
    ],
  );

  return (
    <FirmwareUpgradeContext.Provider value={value}>
      {children}
    </FirmwareUpgradeContext.Provider>
  );
}
