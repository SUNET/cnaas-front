import LogViewer from "../LogViewer";
import PropTypes from "prop-types";

FirmwareProgressInfo.propTypes = {
  jobStatus: PropTypes.string,
  jobId: PropTypes.number,
  jobData: PropTypes.shape,
  logLines: PropTypes.arrayOf(PropTypes.string),
};

export function FirmwareProgressInfo({ jobStatus, jobId, jobData, logLines }) {
  const hasJobId = (id) => {
    return (logLine) => logLine.toLowerCase().includes(`job #${id}`);
  };
  const jobStartTime = jobData?.start_time ?? "";
  const jobFinishTime = jobData?.finish_time ?? "";
  const exceptionMessage =
    jobStatus === "EXCEPTION" ? jobData?.exception?.message : "";

  return (
    <div key={`fw_progess_info_${jobId}`}>
      <p>
        status: {jobStatus} (job #{jobId})
      </p>
      <p className="error">{exceptionMessage}</p>
      <p>start time: {jobStartTime}</p>
      <p>finish time: {jobFinishTime}</p>
      <LogViewer logs={logLines.filter(hasJobId(jobId))} />
    </div>
  );
}
