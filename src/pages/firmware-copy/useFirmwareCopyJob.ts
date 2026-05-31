import { useEffect, useRef } from "react";
import { isJobEvent } from "../../types/socketEvents";
import { socket } from "./stores/socket";

// Terminal job states after which a copy job stops emitting updates.
const TERMINAL_STATUSES = ["FINISHED", "EXCEPTION", "ABORTED"];

// Each firmware row mounts its own watcher, but they all share the singleton
// socket. We reference-count active watchers so the connection is opened for
// the first one and only closed once the last one goes away — otherwise a
// finishing job would disconnect the socket out from under other concurrent
// copy jobs and they'd miss their completion events.
let activeWatchers = 0;

/**
 * Watch a running firmware-copy job over Socket.IO. While `jobId` is set, the
 * socket is connected and listening; when a matching job reaches a terminal
 * state, `onComplete` fires. The shared connection is closed when the last
 * active watcher unmounts or its `jobId` clears.
 */
export function useFirmwareCopyJob(
  token: string | null,
  jobId: number | null,
  onComplete: () => void,
): void {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (jobId === null || !token) return;

    socket.io.opts.query = { jwt: token };

    const handleConnect = () => {
      socket.emit("events", { update: "job" });
    };

    const handleEvents = (data: unknown) => {
      if (
        isJobEvent(data) &&
        data.job_id === jobId &&
        TERMINAL_STATUSES.includes(data.status)
      ) {
        onCompleteRef.current();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("events", handleEvents);

    activeWatchers += 1;
    if (socket.connected) {
      // Already open for another job — the connect event won't fire again, so
      // subscribe to job updates directly.
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("events", handleEvents);
      activeWatchers -= 1;
      if (activeWatchers === 0) {
        socket.disconnect();
      }
    };
  }, [token, jobId]);
}
