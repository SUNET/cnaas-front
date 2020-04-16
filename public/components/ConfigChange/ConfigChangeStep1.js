import React from "react";
import getData from "../../utils/getData";
import { putData } from "../../utils/sendData";

class ConfigChangeStep1 extends React.Component {
  state = {
    commitInfo: [],
    latestCommitInfo: []
    // errorMessage: ""
  };

  getCommitInfo = () => {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/repository/settings";
    getData(url, credentials).then(data => {
      // console.log("this should be data", data);
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
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/repository/settings";
    let dataToSend = { action: "REFRESH" };

    putData(url, credentials, dataToSend).then(data => {
      // console.log("this should be data", data);
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
      <div className="task-container">
        <div className="heading">
          <h2>Refresh repositories (1/4)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
        </div>
        <div className="task-collapsable">
          <div className="info">
            <button onClick={this.getCommitInfo}> See latest settings commit </button>
            <p>{commitInfo}</p>
          </div>
          <div className="info">
            <button onClick={this.refreshCommitInfo}>
              Refresh settings
            </button>
            <p>{refreshedCommitInfo}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep1;
