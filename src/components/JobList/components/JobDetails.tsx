import type { ReactNode } from "react";
import {
  VerifyDiffResult,
  type Device,
} from "../../ConfigChange/components/VerifyDiff/VerifyDiffResult";
import {
  isInitDeviceJob,
  isSyncDevicesJob,
  type DevicesJob,
  type Job,
} from "../../../types/job";

type JobDetailsProps = {
  readonly job: Job;
};

/**
 * Renders job-specific details based on job status and function type.
 * Used in the expanded row of the JobList table.
 */
export function JobDetails({ job }: JobDetailsProps): ReactNode {
  if (job.status === "EXCEPTION") {
    return <ExceptionDetails job={job} />;
  }
  if (isSyncDevicesJob(job)) {
    return <SyncDevicesResult job={job} />;
  }
  if (isInitDeviceJob(job)) {
    return <InitDeviceResult job={job} />;
  }
  // Default: show raw JSON result
  return <pre>{JSON.stringify(job.result, null, 2)}</pre>;
}

function ExceptionDetails({ job }: JobDetailsProps): ReactNode {
  if (job.exception == null) {
    return <p>Empty exception</p>;
  }

  return (
    <>
      <p>Exception message: {job.exception.message}</p>
      <details>
        <summary>Show exception traceback</summary>
        <pre>{job.exception.traceback}</pre>
      </details>
    </>
  );
}

type DevicesJobProps = {
  readonly job: DevicesJob;
};

function SyncDevicesResult({ job }: DevicesJobProps): ReactNode {
  return (
    <>
      <p>Diff results:</p>
      <VerifyDiffResult devices={toVerifyDiffDevices(job.result)} />
    </>
  );
}

// Bridge to ConfigChange's JobTask shape (TODO: drop after ConfigChange migrates).
function toVerifyDiffDevices(result: DevicesJob["result"]): Device[] {
  return Object.entries(result.devices).map(
    ([name, { job_tasks: jobTasks }]) => ({
      name,
      jobTasks: jobTasks.map(
        ({ task_name: taskName, result: r, diff, failed }) => ({
          task_name: taskName,
          result: typeof r === "string" ? r : undefined,
          diff: typeof diff === "string" ? diff : "",
          failed,
        }),
      ),
    }),
  );
}

function InitDeviceResult({ job }: DevicesJobProps): ReactNode {
  const deviceResult = Object.values(job.result.devices);
  if (deviceResult.length === 0) return null;

  const results = deviceResult[0].job_tasks
    .map((task): { key: string; text: string } | undefined => {
      if (task.task_name === "napalm_get") {
        if (
          (typeof task.result === "string" &&
            task.result.length === 0 &&
            task.failed === true) ||
          (typeof task.result === "object" && task.failed === false)
        ) {
          return {
            key: task.task_name,
            text: "Error: Device kept old management IP",
          };
        }
        return { key: task.task_name, text: "New management IP set" };
      }
      if (task.task_name === "Generate initial device config") {
        if (task.failed === true) {
          return {
            key: task.task_name,
            text: `Error: Failed to generate configuration from template: ${String(task.result)}`,
          };
        }
        return {
          key: task.task_name,
          text: "Configuration was generated successfully from template",
        };
      }
      if (task.task_name === "ztp_device_cert") {
        return { key: task.task_name, text: String(task.result) };
      }
      if (task.task_name === "Push base management config") {
        if (
          typeof task.result === "string" &&
          task.result.includes("ReplaceConfigException")
        ) {
          return {
            key: task.task_name,
            text: `Error: Failed to push configuration: ${task.result}`,
          };
        }
        return { key: task.task_name, text: "Pushed base configuration" };
      }
      return undefined;
    })
    .filter((r): r is { key: string; text: string } => r !== undefined);

  return (
    <>
      {results.map((item) => (
        <p key={`${job.id}-${item.key}`}>{item.text}</p>
      ))}
    </>
  );
}
