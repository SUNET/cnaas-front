import React from "react";

class DryRunProgressInfo extends React.Component {
  state = {
    jobId: null,
    confirmJobId: null
  };

  checkJobId(job_id) {
    return function(logLine) {
      return logLine.toLowerCase().includes("job #"+job_id);
    }
  };

  componentDidUpdate() {
      var element = document.getElementById("logoutputdiv"+this.props.key);
      if (element !== null) {
        element.scrollTop = element.scrollHeight;
      }
  }

  render() {
    // console.log("this is props in configchange progress data", this.props);
    let progressData = this.props.dryRunProgressData;
    let jobStatus = this.props.dryRunJobStatus;
    let jobId = this.props.jobId;
    // console.log("this is dryRunProgressData", progressData);
    let jobStartTime = "";
    let jobFinishTime = "";
    let exceptionMessage = "";
    let log = "";
    this.props.logLines.filter(this.checkJobId(jobId)).map((logLine) => {
      log = log + logLine;
    });

    if (Object.keys(progressData).length > 0) {
      jobStartTime = progressData.start_time;
      jobFinishTime = progressData.finish_time;
      if (jobStatus === "EXCEPTION") {
        exceptionMessage = progressData.exception.message;
      }
    }

    return (
      <div key={300+this.props.key} hidden={this.props.hidden}>
        <p>status: {jobStatus} (job #{jobId})</p>
        <p className="error">{exceptionMessage}</p>
        <p>start time: {jobStartTime}</p>
        <p>finish time: {jobFinishTime}</p>
        <div id={"logoutputdiv"+this.props.keyNum} className="logoutput">
          <pre>
            {log}
          </pre>
        </div>
      </div>
    );
  }

  static defaultProps = {
    hidden: false,
    keyNum: 1
  }
}

export default DryRunProgressInfo;
