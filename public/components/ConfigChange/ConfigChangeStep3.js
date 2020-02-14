import React from "react";

class ConfigChangeStep3 extends React.Component {
  approveDiff = () => {
    return console.log("you approved diff");
  };

  rejectDiff = () => {
    return console.log("you rejected diff");
  };

  render() {
    // console.log("these are props in step 3", this.props);
    let devicesObj = this.props.devices;
    console.log("this is devicesObj", devicesObj);
    let dryRunChangeScore = this.props.dryRunChangeScore;

    const deviceNames = Object.keys(devicesObj);
    const deviceData = Object.values(devicesObj);

    const totalDevicesAffected = deviceNames.length;

    // RENDERS DIFF IN DIFFBOX: make separate component?
    // iterate through values
    const deviceDiffArray = deviceData.map(device => {
      return (
        device.job_tasks
          // iterate through the sub_tasks, create a new array where diffs are added (if they are there) and null if its empty
          .map(subJob => {
            if (subJob.diff !== "") {
              return subJob.diff;
            }
            return null;
          })
          // filter out empty diffs
          .filter(diff => diff !== null)
      );
    });
    // console.log("deviceDiffArray", deviceDiffArray);
    const deviceDiffs = deviceDiffArray.map(info => <pre>{info}</pre>);
    // console.log("deviceDiffs", deviceDiffs);

    // RENDER DEVICE NAME OF EACH DIFF: make separate component?
    // 1. what device name has a diff?
    // iterate trhough device data to reach each job_tasks
    const diffDeviceTaskArray = deviceData
      .map((device, i) => {
        let deviceTaskList = device.job_tasks;
          // iterate each job_tasks to be able to reach the diff of each of the three sub_tasks
        return deviceTaskList
          .map((tasks, i) => {
            let deviceSubTasks = tasks.diff;
            // return an array with true or false representing diff with or without content            
            if (deviceSubTasks === "" || deviceSubTasks === undefined) {
              return false;
            } else {
              return true;
            }
          })
          // translate each job_task to true if any of the job tasks have a non-empty diff
          .some(diff => diff === true);
      }) 
      // pair each job_task name with the status true or false 
      .reduce((obj, key, i) => {
        console.log("this is obj", obj);
        console.log("this is key", key);
        return { [deviceNames[i]]: key };
      }, {});
      //2. render only names with status true... 
      

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Verify difference (3/4)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
        </div>
        <div className="task-collapsable">
          <p>Step 3 of 4: Look through and verify diff</p>
          <div>
            <p>Total devices affected: {totalDevicesAffected}</p>
            <p>Total change score: {dryRunChangeScore}</p>
            <div id="diff-box">{deviceDiffs}</div>
            <button key="1" onClick={this.approveDiff}>
              Approve
            </button>
            <button key="2" onClick={this.rejectDiff}>
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep3;
