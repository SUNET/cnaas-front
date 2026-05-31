import { useEffect, useRef } from "react";
import { isJobEvent } from "../../types/socketEvents";
import { isTerminalJobStatus } from "../../types/job";
import { socket } from "./stores/socket";

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
        isTerminalJobStatus(data.status)
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
