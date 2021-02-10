import React from "react";
import ProgressBar from "../../ProgressBar";

class DryRunProgressBar extends React.Component {
  render() {
    let progressData = this.props.dryRunProgressData;
    let jobStatus = this.props.dryRunJobStatus;
    let totalDevices = this.props.totalDevices;

    let finishedDevicesData = [];
    let finishedDevicesNum = 0;

    if (jobStatus === "RUNNING" || jobStatus === "FINISHED") {
      progressData.map((job, i) => {
        finishedDevicesData = job.finished_devices;
        finishedDevicesNum = finishedDevicesData.length;
      });
    }

    return (
      <ProgressBar
        value={finishedDevicesNum}
        total={totalDevices}
        jobStatus={jobStatus}
      />
    );
  }
}

export default DryRunProgressBar;
