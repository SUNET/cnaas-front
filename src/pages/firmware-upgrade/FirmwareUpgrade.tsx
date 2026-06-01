import { useEffect, useReducer, useRef, type ChangeEvent } from "react";
import { useSearchParams } from "react-router";
import { Input } from "semantic-ui-react";
import { NavigationBlocker } from "../../components/NavigationBlocker";
import { FirmwareStep1 } from "./FirmwareStep1";
import { FirmwareStep2 } from "./FirmwareStep2";
import { FirmwareStep3 } from "./FirmwareStep3";
import { getData } from "../../utils/getData";
import { useFreshRef } from "../../hooks/useFreshRef";
import { useAuthToken } from "../../stores/AuthTokenContext";
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

export function FirmwareUpgrade() {
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
    doPoll,
    startError,
  } = state;

  // Derived view state — never stored in the reducer.
  const step2jobStatus = step2JobData?.status ?? null;
  const step3jobStatus = step3JobData?.status ?? null;

  const navigationBlockerMessage =
    "A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave.";

  const updateComment = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: actions.SET_JOB_COMMENT, comment: e.target.value });
  };

  const updateTicketRef = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: actions.SET_JOB_TICKET_REF, ticketRef: e.target.value });
  };

  const skipStep2 = () => {
    dispatch({ type: actions.SET_ACTIVATE_STEP3, activate: true });
  };

  const getCommitTarget = (): CommitTarget | null => {
    const hostname = searchParams.get("hostname");
    if (hostname) {
      return { hostname };
    }
    const group = searchParams.get("group");
    if (group) {
      return { group };
    }

    return null;
  };

  const getCommitTargetName = (target: CommitTarget | null): string => {
    if (target?.hostname) {
      return `hostname: ${target.hostname}`;
    }
    if (target?.group) {
      return `group: ${target.group}`;
    }

    return "unknown";
  };

  const repeatingStep2IntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const repeatingStep3intervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  useFirmwareUpgradeSocket(token, dispatch);

  // Clear any in-flight poll intervals on unmount.
  useEffect(() => {
    return () => {
      clearInterval(repeatingStep2IntervalRef.current ?? undefined);
      clearInterval(repeatingStep3intervalRef.current ?? undefined);
    };
  }, []);

  useEffect(() => {
    if (blockNavigation) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
  }, [blockNavigation]);

  const pollJobStatus = async (id: number, step: number) => {
    const url = `${process.env.API_URL}/api/v1.0/job/${id}`;

    if (step === 2) {
      try {
        const initialStep2Data = await getData(url, tokenRef.current);
        const initialJobStep2Data: Job = initialStep2Data.data.jobs[0];
        dispatch({
          type: actions.SET_STEP2_JOB_DATA,
          data: initialJobStep2Data,
        });
        dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: true });
      } catch (error) {
        console.error("Polling error:", error);
        dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
      }

      repeatingStep2IntervalRef.current = setInterval(async () => {
        try {
          const data = await getData(url, tokenRef.current);
          const jobData: Job = data.data.jobs[0];
          dispatch({ type: actions.SET_STEP2_JOB_DATA, data: jobData });
          if (isTerminalJobStatus(jobData.status)) {
            clearInterval(repeatingStep2IntervalRef.current ?? undefined);
            dispatch({ type: actions.SET_ACTIVATE_STEP3, activate: true });
            dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
            dispatch({
              type: actions.SET_DO_POLL,
              doPoll: { jobId: null, step: null },
            });
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(repeatingStep2IntervalRef.current ?? undefined);
          repeatingStep2IntervalRef.current = null;
          dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
        }
      }, 5000);
    }

    if (step === 3) {
      try {
        const initialStep3Data = await getData(url, tokenRef.current);
        const initialJobStep3Data: Job = initialStep3Data.data.jobs[0];
        dispatch({
          type: actions.SET_STEP3_JOB_DATA,
          data: initialJobStep3Data,
        });
        dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: true });
      } catch (error) {
        console.error("Polling error:", error);
        dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
      }

      repeatingStep3intervalRef.current = setInterval(async () => {
        try {
          const data = await getData(url, tokenRef.current);
          const jobStep3Data: Job = data.data.jobs[0];
          dispatch({ type: actions.SET_STEP3_JOB_DATA, data: jobStep3Data });
          if (isTerminalJobStatus(jobStep3Data.status)) {
            clearInterval(repeatingStep3intervalRef.current ?? undefined);
            dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
            dispatch({
              type: actions.SET_DO_POLL,
              doPoll: { jobId: null, step: null },
            });
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(repeatingStep3intervalRef.current ?? undefined);
          repeatingStep3intervalRef.current = null;
          dispatch({ type: actions.SET_BLOCK_NAVIGATION, blocked: false });
        }
      }, 5000);
    }
  };

  const readHeaders = (response: Response, step: number): Response => {
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

    return response;
  };

  const firmwareUpgradeStart = async (
    step: number,
    filename: string | null,
    startAt: string | null,
    staggeredUpgrade?: boolean,
  ) => {
    const baseUrl =
      process.env.FIRMWARE_URL &&
      typeof process.env.FIRMWARE_URL === "string" &&
      process.env.FIRMWARE_URL.startsWith("http")
        ? process.env.FIRMWARE_URL
        : `${process.env.API_URL}/firmware/`;

    const dataToSend = {
      ...getCommitTarget(),
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
    if (step !== 2 && step !== 3) {
      throw "Invalid argument passed to firmwareUpgradeStart";
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
    } else if (step === 3) {
      dispatch({ type: actions.SET_STEP3_JOB_ID, jobId: data.job_id });
    }
    dispatch({
      type: actions.SET_DO_POLL,
      doPoll: { jobId: data.job_id, step },
    });
  };

  useEffect(() => {
    if (doPoll.jobId && doPoll.step) {
      pollJobStatus(doPoll.jobId, doPoll.step);
    }
  }, [doPoll]);

  const firmwareUpgradeAbort = async (step: number) => {
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

  const commitTarget = getCommitTarget();
  const commitTargetName = getCommitTargetName(commitTarget);
  return (
    <>
      <NavigationBlocker
        when={blockNavigation}
        message={navigationBlockerMessage}
      />
      <section>
        <h1>Firmware upgrade</h1>
        <p>Firmware upgrade target {commitTargetName}</p>
        {startError && <p className="error">{startError}</p>}
        <p>Describe the change:</p>
        <Input
          placeholder="comment"
          maxLength={255}
          className="job_comment"
          onChange={updateComment}
        />
        <p>Enter service ticket ID reference:</p>
        <Input
          placeholder="ticket reference"
          maxLength={32}
          className="job_ticket_ref"
          onChange={updateTicketRef}
        />
        <FirmwareStep1 commitTarget={commitTarget ?? {}} />
        <FirmwareStep2
          firmwareUpgradeStart={firmwareUpgradeStart}
          firmwareUpgradeAbort={firmwareUpgradeAbort}
          jobId={step2JobId}
          jobData={step2JobData}
          totalCount={step2TotalCount}
          logLines={logLines}
          skipStep2={skipStep2}
        />
        <FirmwareStep3
          firmwareUpgradeStart={firmwareUpgradeStart}
          firmwareUpgradeAbort={firmwareUpgradeAbort}
          jobId={step3JobId}
          jobData={step3JobData}
          totalCount={step3TotalCount}
          logLines={logLines}
          filename={filename}
          activateStep3={activateStep3}
          commitTarget={commitTarget ?? {}}
        />
      </section>
    </>
  );
}
