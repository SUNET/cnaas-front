import React from "react";
import ConfigChangeProgressBar from "./ConfigChangeProgressBar";
import getData from "../../utils/getData";
import { postData } from "../../utils/sendData";

class ConfigChangeStep2 extends React.Component {
  state = {
    token:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw",
    syncData: [],
    jobsData: [],
    repeatingData: [], // setInterval ID saved in state to be accessible to all class methods
    dataToSend: { dry_run: true, all: true }
    // errorMessage: ""
  };

  deviceSyncToWithForce = () => {
    this.setState(
      {
        dataToSend: { dry_run: true, all: true, force: true }
      },
      () => {
        this.deviceSyncTo();
      },
      this.setState(prevState => ({
        dataToSend: !prevState.dataToSend
      }))
    );
  };

  deviceSyncTo = () => {
    const credentials = this.state.token;
    let url = "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/device_syncto";
    let dataToSend = this.state.dataToSend;
    console.log("this is dataToSend", dataToSend);
    console.log("you clicked the start sync info button");
    postData(url, credentials, dataToSend).then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            syncData: data
          },
          () => {
            this.syncStatus();
          },
          () => {
            console.log("this is new state", this.state.syncData);
          }
        );
      }
    });
  };

  syncStatus = () => {
    // use jobId from API in url
    // let jobId = this.state.syncData.job_id;
    // mock jobId that returns relevant data
    let jobId = "5ddbe1548b2d390c963b97d8";
    const credentials = this.state.token;
    console.log("this API call is automatic");
    let url = `https://tug-lab.cnaas.sunet.se:8443/api/v1.0/job/${jobId}`;

    let repeatingData = setInterval(() => {
      getData(url, credentials).then(data => {
        console.log("this should be data.data.jobs", data.data.jobs);
        {
          this.setState(
            {
              jobsData: data.data.jobs,
              repeatingData: repeatingData
            },
            () => {
              console.log("this is jobs data", this.state.jobsData);
            }
          );
        }
      });
    }, 500);
  };

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  render() {
    let error = "";
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
      return jobStatus, jobStartTime, jobFinishTime, finishedDevices;
    });

    // stop the setInterval when job status is finished
    if (jobStatus === "FINISHED" || jobStatus === "EXCEPTION") {
      console.log("jobStatus is finished or errored");
      clearInterval(this.state.repeatingData);
    }
    // allow a force retry of dry run if it errored
    // jobStatus === "EXCEPTION"
    if (jobStatus === "FINISHED") {
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
      <div className="workflow-container">
        <div key="0" className="workflow-container__header">
          <h2>Dry run (2/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div key="1" className="workflow-collapsable">
          <p>
            Step 2 of 4: Sending generated configuration to devices to calculate
            diff and check sanity
          </p>
          <div key="2" className="workflow-collapsable__button-result">
            <button key="0" onClick={this.deviceSyncTo}>
              Start sync
            </button>
            <p>{syncMessage}</p>
            <p>{syncStatus}</p>
            <p>{syncJobId}</p>
          </div>
          <div key="3">
            <ConfigChangeProgressBar
              finishedDevices={finishedDevices}
              totalDevices={totalDevices}
            />
          </div>
          <div key="4">
            <p>status: {syncStatus}</p>
            <p>start time: {jobStartTime}</p>
            <p>finish time: {jobFinishTime}</p>
          </div>

          <div key="5">{error}</div>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep2;
