import { useEffect, type Dispatch } from "react";
import { useFreshRef } from "../../../hooks/useFreshRef";
import { socket } from "../stores/socket";
import { actions, type Action } from "../stores/configChangeReducer";
import {
  showSyncToast,
  showSyncWarningToast,
  showAnotherSessionDidRefreshToast,
  clearToastTimers,
} from "../stores/toasts";

type JobEventData = {
  readonly job_id: number;
  readonly status: string;
  readonly function_name?: string;
  readonly scheduled_by?: string;
};

type SyncEventData = {
  readonly syncevent_hostname: string;
  readonly syncevent_data: {
    readonly cause: string;
    readonly by: string;
    readonly job_id?: number;
  };
};

type EventData = JobEventData | SyncEventData | string;

function isJobEvent(data: EventData): data is JobEventData {
  return data != null && typeof data === "object" && "job_id" in data;
}

function isSyncEvent(data: EventData): data is SyncEventData {
  return (
    data != null &&
    typeof data === "object" &&
    "syncevent_hostname" in data &&
    "syncevent_data" in data
  );
}

const STATUS_RUNNING = new Set(["RUNNING"]);
const STATUS_STOPPED = new Set(["FINISHED", "EXCEPTION", "ABORTED"]);

type RepoJobState = {
  readonly repoJobId: number | null;
  readonly stoppedRepoJobs: readonly number[];
  readonly isRepoRefreshing: boolean;
};

export function useConfigChangeSocket(
  token: string | null,
  username: string | null,
  dispatch: Dispatch<Action>,
  repoJobState: RepoJobState,
): void {
  // useFreshRef gives socket handlers synchronous access to the latest values
  // without re-running the effect (which would tear down the connection).
  const usernameRef = useFreshRef(username);
  const repoJobIdRef = useFreshRef(repoJobState.repoJobId);
  const stoppedRepoJobsRef = useFreshRef(repoJobState.stoppedRepoJobs);
  const isRepoRefreshingRef = useFreshRef(repoJobState.isRepoRefreshing);

  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };

    const handleConnect = () => {
      socket.emit("events", { loglevel: "DEBUG" });
      socket.emit("events", { sync: "all" });
      socket.emit("events", { update: "job" });
    };

    const handleError = (error: unknown) => {
      console.error("SOCKET ERROR", error);
    };

    const handleDisconnect = (reason: string, details: unknown) => {
      console.log("SOCKET DISCONNECTED", reason, details);
    };

    const handleEvents = (data: EventData) => {
      if (isJobEvent(data)) {
        handleJobEvent(data);
      } else if (isSyncEvent(data)) {
        handleSyncEvent(data);
      } else if (typeof data === "string") {
        dispatch({ type: actions.APPEND_LOG, line: `${data}\n` });
      }
    };

    const handleJobEvent = (data: JobEventData) => {
      if (STATUS_RUNNING.has(data.status)) {
        if (
          (repoJobIdRef.current === null && isRepoRefreshingRef.current) ||
          repoJobIdRef.current === -1
        ) {
          dispatch({ type: actions.SET_REPO_JOB_ID, jobId: data.job_id });
        } else if (
          data.function_name === "refresh_repo" &&
          (!usernameRef.current || data.scheduled_by !== usernameRef.current)
        ) {
          showAnotherSessionDidRefreshToast(data.job_id);
          dispatch({ type: actions.SET_DRY_RUN_PROGRESS, data: null });
        }
      }

      if (STATUS_STOPPED.has(data.status) && repoJobIdRef.current != null) {
        dispatch({ type: actions.REPO_JOB_STOPPED });
      }
    };

    const handleSyncEvent = (data: SyncEventData) => {
      const eventJobId = data.syncevent_data.job_id;
      let showWarning = true;

      if (eventJobId != null) {
        const jobIsCurrentOrPrevious = (jobId: number) =>
          jobId === repoJobIdRef.current ||
          stoppedRepoJobsRef.current.includes(jobId);

        if (repoJobIdRef.current === -1) {
          showWarning = false;
          setTimeout(() => {
            if (jobIsCurrentOrPrevious(eventJobId)) {
              showSyncToast(data.syncevent_hostname);
            }
          }, 500);
        } else if (jobIsCurrentOrPrevious(eventJobId)) {
          showWarning = false;
          showSyncToast(data.syncevent_hostname);
        }
      }

      if (showWarning) {
        showSyncWarningToast(data);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("error", handleError);
    socket.on("disconnect", handleDisconnect);
    socket.on("events", handleEvents);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("error", handleError);
      socket.off("disconnect", handleDisconnect);
      socket.off("events", handleEvents);
      socket.disconnect();
      clearToastTimers();
    };
  }, [token, dispatch]);
}
