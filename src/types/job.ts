/**
 * Response shape from backend endpoints that schedule a background job.
 *
 * Example: `POST /api/v1.0/device_update_facts`
 *   { "status": "success", "data": "Scheduled job to update facts for a9", "job_id": 123456 }
 *
 * `data` is a human-readable status message; `job_id` is set alongside the
 * envelope. Both are always present on success; failures
 * throw via `checkResponseStatus` in the transport layer.
 */
export type ScheduledJobResponse = {
  readonly status: "success";
  readonly data: string;
  readonly job_id: number;
};

/**
 * Job lifecycle states, mirroring the backend `JobStatus` enum
 */
export const JOB_STATUSES = [
  "UNKNOWN",
  "SCHEDULED",
  "RUNNING",
  "FINISHED",
  "EXCEPTION",
  "ABORTED",
  "ABORTING",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Mirroring the backend `Job` SQLAlchemy model
 */
export type Job = {
  readonly id: number;
  readonly status: JobStatus;
  readonly scheduled_time: string | null;
  readonly start_time: string | null;
  readonly finish_time: string | null;
  readonly function_name: string | null;
  readonly scheduled_by: string | null;
  readonly comment: string | null;
  readonly ticket_ref: string | null;
  readonly next_job_id: number | null;
  readonly result: unknown;
  readonly exception: { message?: string; traceback?: string } | null;
  readonly finished_devices: readonly string[] | null;
  readonly change_score: number | null;
  readonly start_arguments: Record<string, unknown> | null;
};

// --- Result variant shapes ---
//
// `Job.result` is JSONB and varies by function. The FE narrows the per-device
// shape.

/** One task entry within a device's `job_tasks` array. */
export type DeviceTaskResult = {
  readonly task_name: string;
  readonly result: unknown;
  readonly diff: unknown;
  readonly failed: boolean;
};

/** Result entry for a single device. */
export type DeviceResult = {
  readonly failed: boolean;
  readonly job_tasks: readonly DeviceTaskResult[];
};

/** Top-level result shape for jobs that operate on devices. Keys are hostnames. */
export type DevicesJobResult = {
  readonly devices: Readonly<Record<string, DeviceResult>>;
};

/** Runtime guard for the per-device shape — use instead of an `as` assertion. */
export function isDevicesJobResult(value: unknown): value is DevicesJobResult {
  if (value === null || typeof value !== "object") return false;
  const devices = (value as { devices?: unknown }).devices;
  return devices !== null && typeof devices === "object";
}

/**
 * Live-run result shape: a string summary instead of per-device tasks.
 * BE: `cnaas_nms.devicehandler.sync_devices:sync_devices` with `dry_run=False`.
 */
export type LiveRunResult = {
  readonly devices: string;
};

/** Runtime guard for live-run result shape. */
export function isLiveRunResult(value: unknown): value is LiveRunResult {
  if (value === null || typeof value !== "object") return false;
  return typeof (value as { devices?: unknown }).devices === "string";
}

// --- Job-kind guards ---
//
// Narrow a Job by status + function_name + result shape in one check.

/** Job whose `result` is narrowed to `DevicesJobResult`. */
export type DevicesJob = Job & { readonly result: DevicesJobResult };

/** Shared finish+shape check for device-sync guards. */
function isFinishedDevicesJob(job: Job): job is DevicesJob {
  return job.status === "FINISHED" && isDevicesJobResult(job.result);
}

/** Finished dry-run sync (`sync_devices (dry_run)`) — preview, no device writes. */
export function isDryRunSyncJob(job: Job): job is DevicesJob {
  return (
    job.function_name === "sync_devices (dry_run)" && isFinishedDevicesJob(job)
  );
}

/** Finished live-run sync (`sync_devices`) — applied to devices. */
export function isLiveRunSyncJob(job: Job): job is DevicesJob {
  return job.function_name === "sync_devices" && isFinishedDevicesJob(job);
}

/** Finished confirm-run (`confirm_devices`) — two-phase commit follow-up. */
export function isConfirmRunJob(job: Job): job is DevicesJob {
  return job.function_name === "confirm_devices" && isFinishedDevicesJob(job);
}

/** Parent guard: any finished device-sync job (dry-run, live-run, or confirm-run). */
export function isDeviceSyncJob(job: Job): job is DevicesJob {
  return isDryRunSyncJob(job) || isLiveRunSyncJob(job) || isConfirmRunJob(job);
}

/** True for finished init_{access,fabric}_device_step1 jobs with a per-device result. */
export function isInitDeviceJob(job: Job): job is DevicesJob {
  return (
    job.status === "FINISHED" &&
    (job.function_name === "init_access_device_step1" ||
      job.function_name === "init_fabric_device_step1") &&
    isDevicesJobResult(job.result)
  );
}
