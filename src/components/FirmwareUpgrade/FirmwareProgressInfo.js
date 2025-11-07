import React from "react";
import LogViewer from "../LogViewer";
import PropTypes from "prop-types";

class FirmwareProgressInfo extends React.Component {
  state = {
    jobId: null,
  };

  checkJobId(job_id) {
    return function (logLine) {
      return logLine.toLowerCase().includes(`job #${job_id}`);
    };
  }

  render() {
    const { jobStatus } = this.props;
    const { jobId } = this.props;
    const { jobData } = this.props;
    let jobStartTime = "";
    let jobFinishTime = "";
    let exceptionMessage = "";
    let logViewer = (
      <LogViewer logs={this.props.logLines.filter(this.checkJobId(jobId))} />
    );

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
}

FirmwareProgressInfo.propTypes = {
  jobStatus: PropTypes.string,
  jobId: PropTypes.number,
  jobData: PropTypes.shape,
  logLines: PropTypes.arrayOf[PropTypes.string],
};

export default FirmwareProgressInfo;
