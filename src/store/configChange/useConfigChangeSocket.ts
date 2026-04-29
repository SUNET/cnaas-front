import { useEffect, useRef } from "react";
import { socket } from "./socket";
import { actions, type Action } from "./configChangeReducer";
import {
  showSyncToast,
  showSyncWarningToast,
  showAnotherSessionDidRefreshToast,
  clearToastTimers,
} from "./toasts";
import type { Dispatch } from "react";

interface JobEventData {
  readonly job_id: number;
  readonly status: string;
  readonly function_name?: string;
  readonly scheduled_by?: string;
}

interface SyncEventData {
  readonly syncevent_hostname: string;
  readonly syncevent_data: {
    readonly cause: string;
    readonly by: string;
    readonly job_id?: number;
  };
}

type EventData = JobEventData | SyncEventData | string;

interface RepoJobRefs {
  readonly repoJobIdRef: React.MutableRefObject<number | null>;
  readonly stoppedRepoJobs: React.MutableRefObject<number[]>;
  readonly isRepoRefreshingRef: React.MutableRefObject<boolean>;
}

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

export function useConfigChangeSocket(
  token: string | null,
  username: string | null,
  dispatch: Dispatch<Action>,
  repoJobRefs: RepoJobRefs,
): void {
  // Keep refs in a stable ref so the socket effect doesn't re-run
  const refsRef = useRef(repoJobRefs);
  useEffect(() => {
    refsRef.current = repoJobRefs;
  });

  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };

    const handleConnect = () => {
      socket.emit("events", { loglevel: "DEBUG" });
      socket.emit("events", { sync: "all" });
      socket.emit("events", { update: "job" });
    };

    const handleError = (error: unknown) => {
      console.log("SOCKET ERROR", error);
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
        dispatch({
          type: actions.APPEND_LOG,
          line: `${data}\n`,
        });
      }
    };

    const handleJobEvent = (data: JobEventData) => {
      const { repoJobIdRef, stoppedRepoJobs, isRepoRefreshingRef } =
        refsRef.current;

      if (STATUS_RUNNING.has(data.status)) {
        if (
          (repoJobIdRef.current === null && isRepoRefreshingRef.current) ||
          repoJobIdRef.current === -1
        ) {
          repoJobIdRef.current = data.job_id;
        } else if (
          data.function_name === "refresh_repo" &&
          (!username || data.scheduled_by !== username)
        ) {
          showAnotherSessionDidRefreshToast(data.job_id);
          dispatch({ type: actions.SET_DRY_RUN_PROGRESS, data: {} });
        }
      }

      if (STATUS_STOPPED.has(data.status) && repoJobIdRef.current != null) {
        stoppedRepoJobs.current.push(repoJobIdRef.current);
        repoJobIdRef.current = null;
      }
    };

    const handleSyncEvent = (data: SyncEventData) => {
      const { repoJobIdRef, stoppedRepoJobs } = refsRef.current;
      let showWarning = true;
      const eventJobId = data.syncevent_data.job_id;

      if (eventJobId != null) {
        const jobIsCurrentOrPrevious = (jobId: number) =>
          jobId === repoJobIdRef.current ||
          stoppedRepoJobs.current.includes(jobId);

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
