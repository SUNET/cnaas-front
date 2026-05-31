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
 * Terminal job states — once a job reaches one of these it has stopped and
 * emits no further lifecycle updates.
 */
export const TERMINAL_JOB_STATUSES = new Set<JobStatus>([
  "FINISHED",
  "EXCEPTION",
  "ABORTED",
]);

/** True once a job has stopped (reached a terminal state). */
export function isTerminalJobStatus(status: string): boolean {
  return TERMINAL_JOB_STATUSES.has(status as JobStatus);
}

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

// --- Job-kind variants ---
//
// Variants narrow `Job` by `function_name` only — the kind is set at scheduling
// and never changes, independent of lifecycle state. Use the result-shape
// guards (`isDevicesJobResult`, `isLiveRunResult`) separately when reading
// `job.result`, and `isFinished` when status matters.

/** Dry-run sync (`sync_devices (dry_run)`) — preview, no device writes. */
export type DryRunSyncJob = Job & {
  readonly function_name: "sync_devices (dry_run)";
};

/** Live-run sync (`sync_devices`) — applied to devices; result is a string summary when finished. */
export type LiveRunSyncJob = Job & {
  readonly function_name: "sync_devices";
};

/** Confirm-run (`confirm_devices`) — two-phase commit follow-up. */
export type ConfirmRunJob = Job & {
  readonly function_name: "confirm_devices";
};

/** init_{access,fabric}_device_step1 — per-device init. */
export type InitDeviceJob = Job & {
  readonly function_name:
    | "init_access_device_step1"
    | "init_fabric_device_step1";
};

/** Union of variants whose finished `result` is `DevicesJobResult`. Use where
 * the exact variant is irrelevant (e.g. rendering a per-device task table). */
export type DevicesJob = DryRunSyncJob | ConfirmRunJob | InitDeviceJob;

export function isDryRunSyncJob(job: Job): job is DryRunSyncJob {
  return job.function_name === "sync_devices (dry_run)";
}

export function isLiveRunSyncJob(job: Job): job is LiveRunSyncJob {
  return job.function_name === "sync_devices";
}

export function isConfirmRunJob(job: Job): job is ConfirmRunJob {
  return job.function_name === "confirm_devices";
}

/** Parent guard: any device-sync job kind (dry-run, live-run, or confirm-run). */
export function isDeviceSyncJob(
  job: Job,
): job is DryRunSyncJob | LiveRunSyncJob | ConfirmRunJob {
  return isDryRunSyncJob(job) || isLiveRunSyncJob(job) || isConfirmRunJob(job);
}

export function isInitDeviceJob(job: Job): job is InitDeviceJob {
  return (
    job.function_name === "init_access_device_step1" ||
    job.function_name === "init_fabric_device_step1"
  );
}

/** True once the job reached the terminal `FINISHED` state. Use alongside
 * a result-shape guard before reading typed fields on `job.result`. */
export function isFinished(job: Job): boolean {
  return job.status === "FINISHED";
}
