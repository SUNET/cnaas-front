import LogViewer from "../../LogViewer";
import PropTypes from "prop-types";

DryRunProgressInfo.propTypes = {
  dryRunJobStatus: PropTypes.string,
  dryRunProgressData: PropTypes.object,
  jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  logLines: PropTypes.arrayOf(PropTypes.string),
  hidden: PropTypes.bool,
  keyNum: PropTypes.number,
};

DryRunProgressInfo.defaultProps = {
  hidden: false,
  keyNum: 1,
};

export function DryRunProgressInfo({
  dryRunJobStatus,
  dryRunProgressData,
  jobId,
  logLines,
  hidden,
  keyNum,
}) {
  const jobStartTime = dryRunProgressData?.start_time ?? "";
  const jobFinishTime = dryRunProgressData?.finish_time ?? "";
  const exceptionMessage =
    dryRunJobStatus === "EXCEPTION"
      ? (dryRunProgressData?.exception?.message ?? "")
      : "";

  const filterJobId = (id) => {
    return function (logLine) {
      return logLine.toLowerCase().includes(`job #${id}`);
    };
  };

  const logViewer =
    logLines?.length > 0 ? (
      <LogViewer logs={logLines.filter(filterJobId(jobId))} />
    ) : null;

  return (
    <div key={300 + keyNum} hidden={hidden}>
      <p>
        status: {dryRunJobStatus} (job #{jobId})
      </p>
      <p className="error">{exceptionMessage}</p>
      <p>start time: {jobStartTime}</p>
      <p>finish time: {jobFinishTime}</p>
      {logViewer}
    </div>
  );
}
