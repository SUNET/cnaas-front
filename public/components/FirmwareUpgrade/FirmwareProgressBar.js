import React from "react";
import ProgressBar from "../ProgressBar";

class FirmwareProgressBar extends React.Component {
  render() {
    const jobFinishedDevices = this.props.jobFinishedDevices;
    const jobStatus = this.props.jobStatus;
    const totalCount = this.props.totalCount;

    let finishedDevicesNum = 0;
    let percentageValue = 0;

    if (jobStatus === "RUNNING" || jobStatus === "FINISHED") {
      finishedDevicesNum = jobFinishedDevices.length;
      if (totalCount === 0) {
        percentageValue = 0;
      } else {
        percentageValue = (finishedDevicesNum / totalCount) * 100;
      }
    }

    return (
      <ProgressBar
        numberValue={finishedDevicesNum}
        percentValue={percentageValue}
        total={totalCount}
      />
    );
  }
}

export default FirmwareProgressBar;
