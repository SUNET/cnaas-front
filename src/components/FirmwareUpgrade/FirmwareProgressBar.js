import React from "react";
import ProgressBar from "../ProgressBar";

class FirmwareProgressBar extends React.Component {
  render() {
    const { jobFinishedDevices } = this.props;
    const { jobStatus } = this.props;
    const { totalCount } = this.props;

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
