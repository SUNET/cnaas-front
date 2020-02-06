import React from "react";
import ProgressBar from "../../ProgressBar";

class DryRunProgressBar extends React.Component {
  // randomIntFromInterval(min, max) {
  //   return Math.floor(Math.random() * (max - min + 1) + min);
  // }
  render() {
    let progressData = this.props.dryRunProgressData;
    let jobStatus = this.props.dryRunJobStatus;
    let totalDevices = this.props.totalDevices;

    let finishedDevicesData = [];
    let finishedDevicesNum = 0;
    let percentageValue = 0;

    if (jobStatus === "RUNNING") {
      progressData.map((job, i) => {
        finishedDevicesData = job.finished_devices;
        finishedDevicesNum = finishedDevicesData.length;
        console.log("finishedDevicesNum:", finishedDevicesNum);
        percentageValue = (finishedDevicesNum / totalDevices) * 100;
        console.log("this is the percentage value:", percentageValue);
      });
    }
    if (jobStatus === "FINISHED") {
      percentageValue = 100;
    }

    return <ProgressBar value={percentageValue} total={totalDevices} />;
  }
}

export default DryRunProgressBar;