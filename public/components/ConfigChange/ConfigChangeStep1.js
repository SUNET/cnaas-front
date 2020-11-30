import React from "react";
import getData from "../../utils/getData";
import { putData } from "../../utils/sendData";
import { Popup } from "semantic-ui-react";

class ConfigChangeStep1 extends React.Component {
  state = {
    commitInfo: {},
    commitUpdateInfo: {}
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
    let resetCommitUpdateInfo = this.state.commitUpdateInfo;
    resetCommitUpdateInfo[repo_name] = "";
    this.setState({commitUpdateInfo: resetCommitUpdateInfo});

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
            console.log("this is new state", newCommitInfo, newCommitUpdateInfo);
          }
        );
      }
    });
  };

  componentDidMount() {
    this.getRepoStatus('settings');
    this.getRepoStatus('templates');
  }

  prettifyCommit(commitStr) {
//    const p = 'Commit addce6b8e7e62fbf0e6cf0adf6c05ccdab5fe24d master by Johan Marcusson at 2020-11-30 10:55:54+01:00';


    const gitCommitRegex = /Commit ([a-z0-9]{8})([a-z0-9]{32}) (\w+) by (.+) at ([0-9:-\s]+)/i;
    const match = gitCommitRegex.exec(commitStr);
    try {
      let commitPopup = <Popup
                    content={match[1] + match[2]}
                    position="top center"
                    hoverable={true}
                    trigger={<u>{match[1]}</u>} />;
      return <p>Commit {commitPopup} {match[3]} by {match[4]} at {match[5]}</p>;
    } catch(err) {
      return <p>{commitStr}</p>;
    }
  }

  render() {
    let buttonsDisabled = false;
    if (this.props.dryRunJobStatus) {
      buttonsDisabled = true;
    }
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
            {this.prettifyCommit(this.state.commitInfo['settings'])}
          </div>
          <div className="info">
            <p>Latest templates repo commit: </p>
            {this.prettifyCommit(this.state.commitInfo['templates'])}
          </div>
          <div className="info">
            <button disabled={buttonsDisabled} onClick={ () => this.refreshRepo('settings')}>
              Refresh settings
            </button>
            <p>{this.state.commitUpdateInfo['settings']}</p>
          </div>
          <div className="info">
            <button disabled={buttonsDisabled} onClick={ () => this.refreshRepo('templates')}>
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
