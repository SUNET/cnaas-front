/** BE Socket.IO `events` payload for job lifecycle updates.
 *  Emitted on SCHEDULED → RUNNING → FINISHED/EXCEPTION/ABORTED transitions. */
export type JobEvent = {
  readonly job_id: number;
  readonly status: string;
  readonly function_name: string;
  readonly scheduled_by: string;
  readonly exception?: string;
};

export function isJobEvent(data: unknown): data is JobEvent {
  return (
    data != null &&
    typeof data === "object" &&
    "job_id" in data &&
    typeof data.job_id === "number"
  );
}
