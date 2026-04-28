import { useEffect, useRef } from "react";
import { socket } from "./socket";
import { actions, type Action } from "./jobListReducer";
import type { Dispatch } from "react";

interface JobEventData {
  job_id?: number;
  status?: string;
  exception?: string;
}

/**
 * Connects the socket on mount, subscribes to job and log events,
 * dispatches APPEND_LOG actions, and calls onJobUpdate when a job event arrives.
 */
export function useJobListSocket(
  token: string | null,
  dispatch: Dispatch<Action>,
  onJobUpdate: () => void,
): void {
  const onJobUpdateRef = useRef(onJobUpdate);
  useEffect(() => {
    onJobUpdateRef.current = onJobUpdate;
  }, [onJobUpdate]);

  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };
    socket.connect();

    const handleConnect = () => {
      socket.emit("events", { update: "job" });
      dispatch({
        type: actions.APPEND_LOG,
        line: "Listening to job update events\n",
      });
      socket.emit("events", { loglevel: "DEBUG" });
      dispatch({
        type: actions.APPEND_LOG,
        line: "Listening to log message events\n",
      });
    };

    const handleEvents = (data: JobEventData | string) => {
      if (data != null && typeof data === "object" && data.job_id) {
        const line =
          data.status === "EXCEPTION"
            ? `job #${data.job_id} changed status to ${data.status}: ${data.exception}\n`
            : `job #${data.job_id} changed status to ${data.status}\n`;
        dispatch({ type: actions.APPEND_LOG, line });
        onJobUpdateRef.current();
      } else if (typeof data === "string") {
        if (data.toLowerCase().includes("job #")) {
          dispatch({ type: actions.APPEND_LOG, line: `${data}\n` });
        }
      }
    };

    socket.on("connect", handleConnect);
    socket.on("events", handleEvents);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("events", handleEvents);
      socket.disconnect();
    };
  }, [token, dispatch]);
}
