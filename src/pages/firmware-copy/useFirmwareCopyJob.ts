import { useEffect, useRef } from "react";
import { isJobEvent } from "../../types/socketEvents";
import { socket } from "./stores/socket";

/**
 * Watch a running firmware-copy job over Socket.IO. While `jobId` is set, the
 * socket is connected and listening; when a matching job reports FINISHED or
 * EXCEPTION, `onComplete` fires. Disconnects on cleanup or when `jobId` clears.
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
        (data.status === "FINISHED" || data.status === "EXCEPTION")
      ) {
        onCompleteRef.current();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("events", handleEvents);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("events", handleEvents);
      socket.disconnect();
    };
  }, [token, jobId]);
}
