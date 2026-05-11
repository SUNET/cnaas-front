/**
 * Response shape from backend endpoints that schedule a background job.
 *
 * Example: `POST /api/v1.0/device_update_facts`
 *   { "status": "success", "data": "Scheduled job to update facts for a9", "job_id": 123456 }
 *
 * `data` is a human-readable status message; `job_id` is set alongside the
 * envelope (NOT inside `data`). Both are always present on success; failures
 * throw via `checkResponseStatus` in the transport layer.
 */
export type ScheduledJobResponse = {
  readonly status: "success";
  readonly data: string;
  readonly job_id: number;
};
