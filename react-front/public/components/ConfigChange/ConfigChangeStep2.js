import React from "react";
import ConfigChangeProgressBar from "./ConfigChangeProgressBar";
import getData from "../../utils/getData";
import { postData } from "../../utils/sendData";

class ConfigChangeStep2 extends React.Component {
  state = {
    token:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw"
  };

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  render() {
    // extract sync data
    let syncData = this.state.syncData;
    let syncMessage = syncData.data;
    let syncStatus = syncData.status;
    let syncJobId = syncData.job_id;

    // iterate trhough the job data and extract relevant info
    let jobStatus = "";
    let jobStartTime = "";
    let jobFinishTime = "";
    // totalDevices mocked at 100 for progress bar
    let finishedDevices = 0;
    let totalDevices = 100;

    let jobsData = this.state.jobsData;
    jobsData.map((job, i) => {
      jobStatus = job.status;
      jobStartTime = job.start_time;
      jobFinishTime = job.finish_time;

      // generating random data to mock value in progress bar
      finishedDevices = this.randomIntFromInterval(0, 100);
      console.log("this is finsihedDevices", finishedDevices);
      // extracting actual data when API populated
      // let finishedDevices = job.finished_devices.length;
      // let totalDevices = job.result._totals.selected_devices;
      // let exceptionText = job.exception;

      // stop the setInterval when job status is finished
      if (jobStatus === "FINISHED" || jobStatus === "EXCEPTION") {
        console.log("jobStatus is finished or errored");
        clearInterval(this.state.repeatingData);
      }
      return jobStatus, jobStartTime, jobFinishTime, finishedDevices;
    });

    return (
      <div className="workflow-container">
        <div className="workflow-container__header">
          <h2>Dry run (2/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div className="workflow-collapsable">
          <p>
            Step 2 of 4: Sending generated configuration to devices to calculate
            diff and check sanity
          </p>
          <div className="workflow-collapsable__button-result">
            <button key="0" onClick={this.deviceSyncTo}>
              Start sync
            </button>
            <p>{syncMessage}</p>
            <p>{syncStatus}</p>
            <p>{syncJobId}</p>
          </div>
          <div>
            <ConfigChangeProgressBar
              finishedDevices={finishedDevices}
              totalDevices={totalDevices}
            />
          </div>
          <div>
            <p>status: {syncStatus}</p>
            <p>start time: {jobStartTime}</p>
            <p>finish time: {jobFinishTime}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep2;
