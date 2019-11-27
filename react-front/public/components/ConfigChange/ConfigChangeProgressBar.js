import React from "react";
import getData from "../../utils/getData";

class ConfigChangeProgressBar extends React.Component {
  state = {
    // token: "",
    // startJobIdSync: data.job_id,
    // deviceSyncStatus: [],
    // deviceSyncJobId: [],
    // jobsData: [],
    // jobStartTime: []
    // jobFinishTime: []
    // finishedDevices: [],
    // totalDevices: []
    // errorMessage: ""
  };

  render() {
    // let jobProgress = jobsData.map((job, i) => {
    //   // let totalDevices = job.result._totals.selected_devices;
    //   // let finishedDevices = job.finished_devices.length;
    // let jobStatus = job.status;
    //   return finishedDevices, totalDevices;
    // });

    let finishedDevices = 0;
    let totalDevices = 100;

    function randomIntFromInterval(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    }
    finishedDevices = randomIntFromInterval(0, 100);
    console.log("this is finsihedDevices", finishedDevices);

    return (
      <div>
        <div id="progressbar">
          <progress min="0" max="100" value={finishedDevices}></progress>
          <label>
            {finishedDevices}/{totalDevices} devices finished
          </label>
        </div>
      </div>
    );
  }
}

export default ConfigChangeProgressBar;
