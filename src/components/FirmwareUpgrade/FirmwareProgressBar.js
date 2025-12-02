import PropTypes from "prop-types";
import ProgressBar from "../ProgressBar";

function FirmwareProgressBar({ jobFinishedDevices, jobStatus, totalCount }) {
  let finishedDevicesNum = 0;

  if (jobStatus === "RUNNING" || jobStatus === "FINISHED") {
    finishedDevicesNum = jobFinishedDevices.length;
  }

  return (
    <ProgressBar
      value={finishedDevicesNum}
      total={totalCount}
      jobStatus={jobStatus}
    />
  );
}

FirmwareProgressBar.propTypes = {
  jobFinishedDevices: PropTypes.array.isRequired,
  jobStatus: PropTypes.string,
  totalCount: PropTypes.number.isRequired,
};

export default FirmwareProgressBar;
