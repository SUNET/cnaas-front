import ProgressBar from "../../components/ProgressBar";

type FirmwareProgressBarProps = {
  readonly jobFinishedDevices?: readonly string[] | null;
  readonly jobStatus?: string | null;
  readonly totalCount: number;
};

export function FirmwareProgressBar({
  jobFinishedDevices,
  jobStatus,
  totalCount,
}: FirmwareProgressBarProps) {
  const finishedDevicesNum =
    jobStatus === "RUNNING" || jobStatus === "FINISHED"
      ? (jobFinishedDevices?.length ?? 0)
      : 0;

  return (
    <ProgressBar
      value={finishedDevicesNum}
      total={totalCount}
      jobStatus={jobStatus}
    />
  );
}
