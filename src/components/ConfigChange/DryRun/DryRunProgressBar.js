import React from "react";
import ProgressBar from "../../ProgressBar";

class DryRunProgressBar extends React.Component {
  render() {
    const progressData = this.props.dryRunProgressData;
    const jobStatus = this.props.dryRunJobStatus;
    const { totalDevices } = this.props;

    let finishedDevicesData = [];
    let finishedDevicesNum = 0;

    if (jobStatus === "RUNNING" || jobStatus === "FINISHED") {
      if (Object.keys(progressData).length > 0) {
        finishedDevicesData = progressData.finished_devices;
        finishedDevicesNum = finishedDevicesData.length;
      }
    }

    return (
      <ProgressBar
        hidden={this.props.hidden}
        value={finishedDevicesNum}
        total={totalDevices}
        jobStatus={jobStatus}
        key={200 + this.props.keyNum}
      />
    );
  }

  static defaultProps = {
    hidden: false,
    keyNum: 1,
  };
}

export default DryRunProgressBar;
