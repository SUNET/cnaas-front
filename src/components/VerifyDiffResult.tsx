import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SyntaxHighlight from "./SyntaxHighlight";
import type { DeviceTaskResult } from "../types/job";

export type DeviceJobTaskDiff = {
  readonly name: string;
  readonly jobTasks: readonly DeviceTaskResult[];
};

type VerifyDiffResultProps = {
  readonly devices: DeviceJobTaskDiff[];
};

const ignoreTaskNames = new Set(["push_sync_device"]);

type DeviceDiffGroup = {
  readonly key: string;
  readonly names: readonly string[];
  readonly diff: string;
};

type DeviceException = {
  readonly name: string;
  readonly tasks: {
    readonly task_name: string;
    readonly result: string | undefined;
  }[];
};

/** BE Nornir `diff` is `Any`; in practice always a string for sync_devices. */
function diffAsString(diff: unknown): string {
  return typeof diff === "string" ? diff : "";
}

/** BE Nornir `result` is `Any`; failed tasks return string tracebacks. */
function resultAsString(result: unknown): string | undefined {
  return typeof result === "string" ? result : undefined;
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b);
}

export function VerifyDiffResult({ devices }: VerifyDiffResultProps) {
  // null means "all devices", including devices added later.
  const [selectedDeviceNames, setSelectedDeviceNames] = useState<
    string[] | null
  >(null);

  const deviceDiffGroups: DeviceDiffGroup[] = useMemo(() => {
    // Group by exact diff string.
    const groups = new Map<string, string[]>();

    for (const { name, jobTasks } of devices) {
      const diff = jobTasks
        .map((task) => diffAsString(task.diff))
        .filter((d) => d !== "")
        .join("");

      if (diff === "") continue;

      const names = groups.get(diff);
      if (names) {
        names.push(name);
      } else {
        groups.set(diff, [name]);
      }
    }

    return Array.from(groups, ([diff, names]) => ({
      key: JSON.stringify([...names].sort(compareNames)),
      names: [...names].sort(compareNames),
      diff,
    }));
  }, [devices]);

  const deviceNames = useMemo(
    () =>
      Array.from(
        new Set(deviceDiffGroups.flatMap((group) => group.names)),
      ).sort(compareNames),
    [deviceDiffGroups],
  );

  const selectedNames = useMemo(() => {
    if (selectedDeviceNames === null) return deviceNames;

    const selected = new Set(selectedDeviceNames);
    return deviceNames.filter((name) => selected.has(name));
  }, [deviceNames, selectedDeviceNames]);

  const visibleDiffGroups = useMemo(() => {
    const selected = new Set(selectedNames);

    return deviceDiffGroups
      .map((group) => ({
        ...group,
        names: group.names.filter((name) => selected.has(name)),
      }))
      .filter((group) => group.names.length > 0);
  }, [deviceDiffGroups, selectedNames]);

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
              result: resultAsString(task.result),
            })),
          };
        })
        .filter((d): d is DeviceException => d !== null),
    [devices],
  );

  const hasEmptyDiffs = devices.length > 0 && deviceDiffGroups.length === 0;
  const hasFailures = deviceExceptions.length > 0;
  const showEmptyDiffsMessage = hasEmptyDiffs && !hasFailures;

  let diffMessage: string | null = null;

  if (
    deviceNames.length === 0 &&
    visibleDiffGroups.length === 0 &&
    !hasEmptyDiffs
  ) {
    // No data yet: display nothing.
    diffMessage = null;
  } else if (selectedNames.length === 0 && deviceNames.length > 0) {
    diffMessage = "Select devices to view their diffs.";
  } else if (showEmptyDiffsMessage) {
    diffMessage = "All devices returned empty diffs";
  } else if (visibleDiffGroups.length === 0) {
    diffMessage = "No non-empty diffs for the selected devices.";
  }

  return (
    <div>
      <section className="diff-box">
        <Stack spacing={2}>
          {/* Only when deviceNames.length > 1 */}
          {deviceNames.length > 1 && (
            <>
              <Autocomplete
                multiple
                disableCloseOnSelect
                limitTags={5}
                options={deviceNames}
                value={selectedNames}
                onChange={(_, names) => setSelectedDeviceNames(names)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Devices"
                    placeholder="Search devices"
                    helperText={`${selectedNames.length} of ${deviceNames.length} devices selected`}
                  />
                )}
              />

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={() => setSelectedDeviceNames(null)}
                >
                  Select all
                </Button>
                <Button size="small" onClick={() => setSelectedDeviceNames([])}>
                  Clear selection
                </Button>
              </Stack>
            </>
          )}

          {diffMessage !== null && (
            <Typography color="text.secondary">{diffMessage}</Typography>
          )}

          {visibleDiffGroups.map((group) => (
            <Paper key={group.key} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2">
                  {group.names.length === 1
                    ? "Device diff"
                    : `Identical diff across ${group.names.length} devices`}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {group.names.map((name) => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>

                <Box sx={{ minWidth: 0, overflowX: "auto" }}>
                  <SyntaxHighlight
                    syntaxLanguage="language-diff diff-highlight"
                    code={group.diff}
                  />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
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
