import React from "react";
import getData from "../utils/getData";
import { putData } from "../utils/sendData";

class Workflow_step1 extends React.Component {
  state = {
    // token: "",
    commitInfo: [],
    latestCommitInfo: []
    // errorMessage: ""
  };

  getCommitInfo = () => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    let url =
      "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/repository/settings";
  
    getData(url, credentials).then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            commitInfo: data.data
          },
          () => {
            console.log("this is new state", this.state.commitInfo);
          }
        );
      }
    });
  };

  // this request takes some time, perhaps work in a "loading..."
  refreshCommitInfo = () => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    let url =
      "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/repository/settings";
    let dataToSend = { action: "REFRESH" };

    putData(url, credentials, dataToSend).then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            latestCommitInfo: data.data
          },
          () => {
            console.log("this is new state", this.state.latestCommitInfo);
          }
        );
      }
    });
  };

  render() {
    let commitInfo = this.state.commitInfo;
    let refreshedCommitInfo = this.state.latestCommitInfo;

    return (
      <div className="workflow-container">
        <div className="workflow-container__header">
          <h2>Refresh repositories (1/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div className="workflow-collapsable">
          <div className="workflow-collapsable__button-result">
            <button onClick={this.getCommitInfo}> See latest commit </button>
            <p>{commitInfo}</p>
          </div>
          <div className="workflow-collapsable__button-result">
            <button onClick={this.refreshCommitInfo}>
              Refresh commit info
            </button>
            <p>{refreshedCommitInfo}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default Workflow_step1;
