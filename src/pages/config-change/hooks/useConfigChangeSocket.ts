import { useEffect, type Dispatch } from "react";
import { useFreshRef } from "../../../hooks/useFreshRef";
import { type JobEvent, isJobEvent } from "../../../types/socketEvents";
import { isTerminalJobStatus } from "../../../types/job";
import { socket } from "../stores/socket";
import {
  type SyncNotification,
  isSyncNotification,
} from "../stores/socketEvents";
import {
  actions,
  type Action,
  type ConfigChangeState,
} from "../stores/configChangeReducer";
import {
  showSyncToast,
  showSyncWarningToast,
  showAnotherSessionDidRefreshToast,
  clearToastTimers,
} from "../stores/toasts";

type EventData = JobEvent | SyncNotification | string;

const STATUS_RUNNING = new Set(["RUNNING"]);

type RepoJobState = Pick<
  ConfigChangeState,
  "repoJobId" | "stoppedRepoJobs" | "isRepoRefreshing"
>;

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
      } else if (isSyncNotification(data)) {
        handleSyncEvent(data);
      } else if (typeof data === "string") {
        dispatch({ type: actions.APPEND_LOG, line: `${data}\n` });
      }
    };

    const handleJobEvent = (data: JobEvent) => {
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

      if (isTerminalJobStatus(data.status) && repoJobIdRef.current != null) {
        dispatch({ type: actions.REPO_JOB_STOPPED });
      }
    };

    const handleSyncEvent = (data: SyncNotification) => {
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
