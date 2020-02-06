import React from "react";

class DryRunProgressInfo extends React.Component {
  render() {
    // console.log("this is props in configchange progress data", this.props);
    let progressData = this.props.dryRunProgressData;
    let jobStatus = this.props.dryRunJobStatus;
    // console.log("this is dryRunProgressData", progressData);
    let jobStartTime = "";
    let jobFinishTime = "";
    let exceptionMessage = "";

    progressData.map((job, i) => {
      jobStartTime = job.start_time;
      jobFinishTime = job.finish_time;
      if (jobStatus === "EXCEPTION") {
        exceptionMessage = job.exception.message;
      }
    });

    return (
      <div key="1">
        <p>status: {jobStatus}</p>
        <p className="error">{exceptionMessage}</p>
        <p>start time: {jobStartTime}</p>
        <p>finish time: {jobFinishTime}</p>
      </div>
    );
  }
}

export default DryRunProgressInfo;
