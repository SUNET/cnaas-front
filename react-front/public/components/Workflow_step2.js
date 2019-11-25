import React from "react";
import checkResponseStatus from "../utils/checkResponseStatus";
//WORK IN PROGRESS

class Workflow_step2 extends React.Component {
  state = {
    // token: "",
    deviceSync: [],
    deviceSyncStatus: [],
    deviceSyncJobId: []
    // errorMessage: ""
  };

  deviceSyncTo = () => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    console.log("you clicked the start sync info button");
    fetch("https://tug-lab.cnaas.sunet.se:8443/api/v1.0/device_syncto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify({ dry_run: true, all: true })
    })
      .then(response => checkResponseStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              deviceSync: data.data,
              deviceSyncStatus: data.status,
              deviceSyncJobId: data.job_id
            },
            () => {
              console.log("this is new state", this.state.deviceSync);
            }
          );
        }
      });
  };

  render() {
    // console.log("these are props (in Workflow)", this.props);
    let syncMessage = this.state.deviceSync;
    let syncStatus = this.state.deviceSyncStatus;
    // use this info for next api call 
    let syncJobId = this.state.deviceSyncJobId; 
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
            <button onClick={this.deviceSyncTo}> Start sync </button>
            <p>{syncMessage}</p>
            <p>{syncStatus}</p>
            <p>{syncJobId}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default Workflow_step2;
