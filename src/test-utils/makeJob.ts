import type { Job } from "../types/job";

/**
 * Build a `Job` with sensible defaults for tests. Override any field via `overrides`.
 *
 * Default represents a freshly-running job with no result yet — match BE RUNNING
 * state (`finish_time: null`, `result: null`, `exception: null`, `change_score: null`,
 * `finished_devices: []`).
 */
export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    status: "RUNNING",
    scheduled_time: null,
    start_time: null,
    finish_time: null,
    function_name: null,
    scheduled_by: null,
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    result: null,
    exception: null,
    finished_devices: [],
    change_score: null,
    start_arguments: null,
    ...overrides,
  };
}
