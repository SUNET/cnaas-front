/**
 * Sync history types.
 *
 * Returned by `GET /api/v1.0/device_synchistory`. The transport layer unwraps
 * the envelope (`{status, data: {hostnames: ...}}`) so FE code sees a flat map
 * from hostname to event list.
 */

/** A single sync event for a device. */
export type SyncEvent = {
  readonly cause: string;
  readonly by: string;
  readonly timestamp: number;
  readonly job_id: number | null;
};

/** Sync history map: hostname → list of events (newest first per BE). */
export type SyncHistory = Readonly<Record<string, readonly SyncEvent[]>>;
