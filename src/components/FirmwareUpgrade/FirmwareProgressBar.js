import ProgressBar from "../ProgressBar";

export function FirmwareProgressBar({
  jobFinishedDevices,
  jobStatus,
  totalCount,
}) {
  const finishedDevicesNum =
    jobStatus === "RUNNING" || jobStatus === "FINISHED"
      ? jobFinishedDevices.length
      : 0;

  return (
    <ProgressBar
      value={finishedDevicesNum}
      total={totalCount}
      jobStatus={jobStatus}
    />
  );
}
