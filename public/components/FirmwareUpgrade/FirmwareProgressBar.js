import React from "react";
import ProgressBar from "../ProgressBar";

class FirmwareProgressBar extends React.Component {
  render() {
    const jobFinishedDevices = this.props.jobFinishedDevices;
    const jobStatus = this.props.jobStatus;
    const totalCount = this.props.totalCount;

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
}

export default FirmwareProgressBar;
