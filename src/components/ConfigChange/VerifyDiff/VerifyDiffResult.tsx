import { useMemo } from "react";
import SyntaxHighlight from "../../SyntaxHighlight";
import type { JobTask } from "../../../store/configChange/configChangeReducer";

export type { JobTask };

export interface Device {
  readonly name: string;
  readonly jobTasks: JobTask[];
}

interface VerifyDiffResultProps {
  readonly devices: Device[];
}

const ignoreTaskNames = new Set(["push_sync_device"]);

interface DeviceDiff {
  readonly name: string;
  readonly diff: string;
}

interface DeviceException {
  readonly name: string;
  readonly tasks: {
    readonly task_name: string;
    readonly result: string | undefined;
  }[];
}

export function VerifyDiffResult({ devices }: VerifyDiffResultProps) {
  const deviceDiffs: DeviceDiff[] = useMemo(
    () =>
      devices
        .map(({ name, jobTasks }) => {
          const diff = jobTasks
            .map((task) => task.diff)
            .filter((d) => d !== "")
            .join("");
          return diff ? { name, diff } : null;
        })
        .filter((d): d is DeviceDiff => d !== null),
    [devices],
  );

  const deviceExceptions: DeviceException[] = useMemo(
    () =>
      devices
        .map(({ name, jobTasks }) => {
          const failedTasks = jobTasks.filter(
            (task) =>
              task.failed === true && !ignoreTaskNames.has(task.task_name),
          );
          if (failedTasks.length === 0) return null;
          return {
            name,
            tasks: failedTasks.map((task) => ({
              task_name: task.task_name,
              result: task.result,
            })),
          };
        })
        .filter((d): d is DeviceException => d !== null),
    [devices],
  );

  const hasEmptyDiffs = devices.length > 0 && deviceDiffs.length === 0;
  const hasFailures = deviceExceptions.length > 0;
  const showEmptyDiffsMessage = hasEmptyDiffs && !hasFailures;

  return (
    <div>
      <section className="diff-box">
        <ul>
          {showEmptyDiffsMessage ? (
            <li>
              <p>All devices returned empty diffs</p>
            </li>
          ) : (
            deviceDiffs.map((device, i) => (
              <li key={device.name}>
                <p className="device-name">{device.name} diffs</p>
                <SyntaxHighlight
                  index={i}
                  syntaxLanguage="language-diff diff-highlight"
                  code={device.diff}
                />
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="diff-box">
        <ul>
          {deviceExceptions.map((device) => (
            <li key={device.name}>
              <p className="device-name">{device.name} failed result</p>
              {device.tasks.map((task) => (
                <div key={task.task_name}>
                  <pre className="exception">
                    {task.result?.split("\n").slice(-2).join("\n")}
                  </pre>
                  <details>
                    <summary>Show full traceback</summary>
                    <pre className="traceback">{task.result}</pre>
                  </details>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
