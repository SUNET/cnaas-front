import LogViewer from "../LogViewer";
import PropTypes from "prop-types";

function FirmwareProgressInfo({ jobStatus, jobId, jobData, logLines }) {
  const checkJobId = (job_id) => {
    return function (logLine) {
      return logLine.toLowerCase().includes(`job #${job_id}`);
    };
  };

  let jobStartTime = "";
  let jobFinishTime = "";
  let exceptionMessage = "";
  let logViewer = <LogViewer logs={logLines.filter(checkJobId(jobId))} />;

  if (jobData !== null) {
    jobStartTime = jobData.start_time;
    jobFinishTime = jobData.finish_time;
    if (jobStatus === "EXCEPTION") {
      exceptionMessage = jobData.exception.message;
    }
  }

  return (
    <div key="1">
      <p>
        status: {jobStatus} (job #{jobId})
      </p>
      <p className="error">{exceptionMessage}</p>
      <p>start time: {jobStartTime}</p>
      <p>finish time: {jobFinishTime}</p>
      {logViewer}
    </div>
  );
}

FirmwareProgressInfo.propTypes = {
  jobStatus: PropTypes.string,
  jobId: PropTypes.number,
  jobData: PropTypes.object,
  logLines: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default FirmwareProgressInfo;
