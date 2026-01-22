import PropTypes from "prop-types";
import ProgressBar from "../ProgressBar";

FirmwareProgressBar.propTypes = {
  jobFinishedDevices: PropTypes.array,
  jobStatus: PropTypes.string,
  totalCount: PropTypes.number,
};

export function FirmwareProgressBar({
  jobFinishedDevices,
  jobStatus,
  totalCount,
}) {
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
