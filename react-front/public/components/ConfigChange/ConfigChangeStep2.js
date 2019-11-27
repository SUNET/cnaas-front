import React from "react";
import ConfigChangeProgressBar from "./ConfigChangeProgressBar";
import getData from "../../utils/getData";
import { postData } from "../../utils/sendData";
//WORK IN PROGRESS

class ConfigChangeStep2 extends React.Component {
  state = {
    // token: "",
    deviceSync: [],
    deviceSyncStatus: [],
    deviceSyncJobId: [],
    jobsData: []
    // jobStartTime: [],
    // jobFinishTime: []
    // finishedDevices: [],
    // totalDevices: []
    // errorMessage: ""
  };

  deviceSyncTo = () => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";

    console.log("you clicked the start sync info button");
    let url = "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/device_syncto";
    let dataToSend = { dry_run: true, all: true };
    postData(url, credentials, dataToSend).then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            deviceSync: data.data,
            deviceSyncStatus: data.status,
            deviceSyncJobId: data.job_id
            // startJobIdSync: data.job_id
            // jobStartTime: data.start_time,
            // jobFinishTime: data.finish_time
            // exception: data.exception
          },
          () => {
            this.syncStatus();
          },
          () => {
            console.log("this is new state", this.state.deviceSyncJobId);
          }
        );
      }
    });
  };

  syncStatus = () => {
    // let jobId = this.state.deviceSyncJobId;
    // console.log("this is id", id);
    let jobId = "5ddbe1548b2d390c963b97d8";
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";

    console.log("this API call is automatic");
    let url = `https://tug-lab.cnaas.sunet.se:8443/api/v1.0/job/${jobId}`;
    getData(url, credentials).then(data => {
      console.log("this should be data.data.jobs", data.data.jobs);
      {
        this.setState(
          {
            jobsData: data.data.jobs
          },
          () => {
            console.log("this is jobs data", this.state.jobsData);
          }
        );
      }
    });
  };

  render() {
    // console.log("these are props (in Workflow)", this.props);
    let syncMessage = this.state.deviceSync;
    let syncStatus = this.state.deviceSyncStatus;
    let syncJobId = this.state.deviceSyncJobId;
    let jobsData = this.state.jobsData;
    // let exceptionText = job.exception;
    let jobStatus = "";
    let jobStartTime = "";
    let jobFinishTime = "";

    jobsData.map((job, i) => {
      jobStatus = job.status;
      jobStartTime = job.start_time;
      jobFinishTime = job.finish_time;

      return jobStatus, syncStatus, jobStartTime, jobFinishTime;
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
            <ConfigChangeProgressBar jobData={this.state.jobsData} />
          </div>
          <div>
            <p>Other job info</p>
            <p>job status: {jobStatus}</p>
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
