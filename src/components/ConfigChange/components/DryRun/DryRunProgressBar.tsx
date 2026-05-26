import ProgressBar from "../../../ProgressBar";
import type { Job } from "../../../../types/job";

type DryRunProgressBarProps = {
  readonly dryRunProgressData: Job | null;
  readonly dryRunJobStatus: string | null;
  readonly hidden?: boolean;
  readonly totalDevices: number;
  readonly keyNum?: number;
};

export function DryRunProgressBar({
  dryRunProgressData,
  dryRunJobStatus,
  hidden = false,
  totalDevices,
  keyNum = 1,
}: DryRunProgressBarProps) {
  const isActiveJob =
    dryRunJobStatus === "RUNNING" || dryRunJobStatus === "FINISHED";
  const finishedDevicesNum = isActiveJob
    ? (dryRunProgressData?.finished_devices?.length ?? 0)
    : 0;

  return (
    <ProgressBar
      hidden={hidden}
      value={finishedDevicesNum}
      total={totalDevices}
      jobStatus={dryRunJobStatus}
      key={200 + keyNum}
    />
  );
}
