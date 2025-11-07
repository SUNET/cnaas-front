import React from "react";
import LogViewer from "../../LogViewer";
import PropTypes from "prop-types";

class DryRunProgressInfo extends React.Component {
  state = {
    jobId: null,
    confirmJobId: null,
  };

  checkJobId(job_id) {
    return function (logLine) {
      return logLine.toLowerCase().includes(`job #${job_id}`);
    };
  }

  render() {
    // console.log("this is props in configchange progress data", this.props);
    const progressData = this.props.dryRunProgressData;
    const jobStatus = this.props.dryRunJobStatus;
    const { jobId } = this.props;
    // console.log("this is dryRunProgressData", progressData);
    let jobStartTime = "";
    let jobFinishTime = "";
    let exceptionMessage = "";
    let logViewer = "";

    if (this.props.logLines !== undefined && this.props.logLines.length > 0) {
      logViewer = (
        <LogViewer logs={this.props.logLines.filter(this.checkJobId(jobId))} />
      );
    }

    if (Object.keys(progressData).length > 0) {
      jobStartTime = progressData.start_time;
      jobFinishTime = progressData.finish_time;
      if (jobStatus === "EXCEPTION") {
        exceptionMessage = progressData.exception.message;
      }
    }

    return (
      <div key={300 + this.props.key} hidden={this.props.hidden}>
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

  static defaultProps = {
    hidden: false,
    keyNum: 1,
  };
}

DryRunProgressInfo.propTypes = {
  dryRunJobStatus: PropTypes.string,
  dryRunProgressData: PropTypes.arrayOf[PropTypes.string],
  jobId: PropTypes.number,
  confirmJobId: PropTypes.number,
  logLines: PropTypes.arrayOf[PropTypes.string],
  hidden: PropTypes.bool,
  keyNum: PropTypes.number,
};

export default DryRunProgressInfo;
