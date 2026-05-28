/** BE Socket.IO `events` payload for device sync notifications.
 *  Feature-local to ConfigChange (other features don't consume this event). */
export type SyncNotification = {
  readonly syncevent_hostname: string;
  readonly syncevent_data: {
    readonly cause: string;
    readonly by: string;
    readonly job_id?: number;
  };
};

export function isSyncNotification(data: unknown): data is SyncNotification {
  return (
    data != null &&
    typeof data === "object" &&
    "syncevent_hostname" in data &&
    "syncevent_data" in data
  );
}
