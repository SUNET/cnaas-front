import { useEffect, useRef } from "react";
import { isJobEvent } from "../../types/socketEvents";
import { socket } from "./stores/socket";

// Terminal job states after which a copy job stops emitting updates.
const TERMINAL_STATUSES = ["FINISHED", "EXCEPTION", "ABORTED"];

/**
 * Listen for the terminal transition of a single firmware-copy job. All rows
 * share the one connection opened by useFirmwareCopySocket; each row simply
 * adds a listener that matches incoming events by its own job id, so a
 * completing or unmounting row never affects any other row.
 */
export function useFirmwareCopyJob(
  jobId: number | null,
  onComplete: () => void,
): void {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (jobId === null) return;

    const handleEvents = (data: unknown) => {
      if (
        isJobEvent(data) &&
        data.job_id === jobId &&
        TERMINAL_STATUSES.includes(data.status)
      ) {
        onCompleteRef.current();
      }
    };

    socket.on("events", handleEvents);

    return () => {
      socket.off("events", handleEvents);
    };
  }, [jobId]);
}
