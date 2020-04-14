import React from "react";
import getData from "../../utils/getData";
import { putData } from "../../utils/sendData";

class ConfigChangeStep1 extends React.Component {
  state = {
    commitInfo: {},
    commitUpdateInfo: {},
  };

  getRepoStatus = (repo_name) => {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/repository/" + repo_name;
    let newCommitInfo = this.state.commitInfo;
    getData(url, credentials).then(data => {
      // console.log("this should be data", data);
      newCommitInfo[repo_name] = data.data;
      {
        this.setState(
          {
            commitInfo: newCommitInfo
          },
          () => {
            console.log("this is new state", this.state.commitInfo);
          }
        );
      }
    });
  };

  // this request takes some time, perhaps work in a "loading..."
  refreshRepo = (repo_name) => {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/repository/" + repo_name;
    let dataToSend = { action: "REFRESH" };
    let newCommitInfo = this.state.commitInfo;
    let newCommitUpdateInfo = this.state.commitUpdateInfo;

    putData(url, credentials, dataToSend).then(data => {
      // console.log("this should be data", data);
      if ( data.status === "success" ) {
        newCommitUpdateInfo[repo_name] = "success";
        newCommitInfo[repo_name] = data.data;
      } else {
        newCommitUpdateInfo[repo_name] = "error";
        newCommitInfo[repo_name] = data.message;
      }
      {
        this.setState(
          {
            commitInfo: newCommitInfo,
            commitUpdateInfo: newCommitUpdateInfo
          },
          () => {
            console.log("this is new state", this.state.latestCommitInfo);
          }
        );
      }
    });
  };

  componentDidMount() {
    this.getRepoStatus('settings');
    this.getRepoStatus('templates');
  }

  render() {
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
            <p>Latest settings repo commit: </p>
            <p>{this.state.commitInfo['settings']}</p>
          </div>
          <div className="info">
            <p>Latest templates repo commit: </p>
            <p>{this.state.commitInfo['templates']}</p>
          </div>
          <div className="info">
            <button onClick={ () => this.refreshRepo('settings')}>
              Refresh settings
            </button>
            <p>{this.state.commitUpdateInfo['settings']}</p>
          </div>
          <div className="info">
            <button onClick={ () => this.refreshRepo('templates')}>
              Refresh templates
            </button>
            <p>{this.state.commitUpdateInfo['templates']}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep1;
