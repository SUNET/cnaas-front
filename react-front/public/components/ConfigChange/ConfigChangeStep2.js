import React from "react";
import ProgressBar from "./ProgressBar";
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
    console.log("this is props in configchange step 2", this.props);
    let dryRunProgressData = this.props.dryRunProgressData;
    let dryRunJobStatus = this.props.dryRunJobStatus;

    let jobStartTime = "";
    let jobFinishTime = "";
    dryRunProgressData.map((job, i) => {
      jobStartTime = job.start_time;
      jobFinishTime = job.finish_time;
    });

    //  totalDevices mocked at 100 for progress bar
    let finishedDevices = 0;
    let totalDevices = 100;
    if (dryRunJobStatus === "RUNNING") {
      dryRunProgressData.map((job, i) => {
        finishedDevices = this.randomIntFromInterval(0, 100);
        // finishedDevices = job.finished_devices;
      });
    }

    let exceptionMessage = "";
    let retryButtons = "";
    if (dryRunJobStatus === "EXCEPTION") {
      dryRunProgressData.map((job, i) => {
        exceptionMessage = job.exception.message;
      });

      retryButtons = [
        <div>
          <button key="1" onClick={e => this.props.dryRunSyncStart(e)}>
            Retry
          </button>
          <button
            id="force-button"
            key="2"
            onClick={e => this.props.dryRunSyncStart(e)}
          >
            Force retry
          </button>
        </div>
      ];
    }

    let failingDevices = "";
    if (dryRunJobStatus === "FINISHED") {
      finishedDevices = 100;
      // failingDevices = [<DeviceFailList devices={this.props.devices} />];
    }

    // stop the setInterval when job status is finished
    if (dryRunJobStatus === "FINISHED" || dryRunJobStatus  === "EXCEPTION") {
      console.log("jobStatus is finished or errored");
      clearInterval(this.state.repeatingData);
    }
    // allow a force retry of dry run if it errored
    // jobStatus === "EXCEPTION"
    if (dryRunJobStatus === "EXCEPTION") {
      console.log("jobStatus errored");
      error = [
        <div>
          <p key="0">something went wrong</p>
          <button key="1" onClick={this.deviceSyncTo}>
            Retry
          </button>
          <button key="2" onClick={this.deviceSyncToWithForce}>
            Force retry
          </button>
        </div>
      ];
    }

    return (
      <div>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Dry run (2/4)</h2>
            <a href="#">
              <button className="workflow-container__button--hide">
                Close
              </button>
            </a>
          </div>
          <div key="1" className="workflow-collapsable">
            <p>
              Step 2 of 4: Sending generated configuration to devices to
              calculate diff and check sanity
            </p>
            <div key="0" className="inner-content">
              <button key="0" onClick={e => this.props.dryRunSyncStart(e)}>
                Start config dry run
              </button>
            </div>
            <div key="1">
              <ProgressBar
                value={finishedDevices}
                total={totalDevices}
              />
              <p>status: {dryRunJobStatus}</p>
              <p className="error">{exceptionMessage}</p>
              <p>start time: {jobStartTime}</p>
              <p>finish time: {jobFinishTime}</p>
            </div>
          </div>
          {failingDevices}
          {retryButtons}
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep2;
