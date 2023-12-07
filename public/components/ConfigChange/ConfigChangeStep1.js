import React from "react";
import getData from "../../utils/getData";
import { putData } from "../../utils/sendData";
import { Popup, Icon } from "semantic-ui-react";
import permissionsCheck from "../../utils/permissions/permissionsCheck"

class ConfigChangeStep1 extends React.Component {
  state = {
    commitInfo: {},
    commitUpdateInfo: {
      'settings': null,
      'templates': null,
    },
    expanded: true
  };

  toggleExpand = (e, props) => {
    this.setState({expanded: !this.state.expanded});
  }

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
    let newCommitUpdateInfo = this.state.commitUpdateInfo;
    newCommitUpdateInfo[repo_name] = "updating...";
    this.setState({commitUpdateInfo: newCommitUpdateInfo});
    this.props.setRepoWorking(true);

    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/repository/" + repo_name;
    let dataToSend = { action: "REFRESH" };
    let newCommitInfo = this.state.commitInfo;

    putData(url, credentials, dataToSend).then(data => {
      // console.log("this should be data", data);
      if ( data.status === "success" ) {
        newCommitUpdateInfo[repo_name] = "success";
        newCommitInfo[repo_name] = data.data;
        this.props.setRepoWorking(false);
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
    }).catch(error => {
      newCommitUpdateInfo[repo_name] = "error";
      newCommitInfo[repo_name] = error.message;
      this.setState(
        {
          commitInfo: newCommitInfo,
          commitUpdateInfo: newCommitUpdateInfo
        },
        () => {
          console.log("this is new state", newCommitInfo, newCommitUpdateInfo);
        }
      );
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
    } else if (this.state.commitUpdateInfo['settings'] == 'updating...' || 
            this.state.commitUpdateInfo['templates'] == 'updating...') {
      buttonsDisabled = true;
    }
    return (
      <div className="task-container">
        <div className="heading">
          <h2>
            <Icon name='dropdown' onClick={this.toggleExpand} rotated={this.state.expanded?null:"counterclockwise"} />
            Optional: Refresh repositories (1/4)
            <Popup
              content="Pull latest commits from git repository to NMS server. You can skip this step if you know there are no changes in the git repository."
              trigger={<Icon name="question circle outline" size="small" />}
              wide
              />
          </h2>
        </div>
        <div className="task-collapsable" hidden={!this.state.expanded}>
          <div className="info">
            <p>Latest settings repo commit: </p>
            {this.prettifyCommit(this.state.commitInfo['settings'])}
          </div>
          <div className="info">
            <p>Latest templates repo commit: </p>
            {this.prettifyCommit(this.state.commitInfo['templates'])}
          </div>
          <div className="info">
            <button hidden={!permissionsCheck("Config change", "write")} disabled={buttonsDisabled} onClick={ () => this.refreshRepo('settings')}>
              Refresh settings
            </button>
            <p>{this.state.commitUpdateInfo['settings']}</p>
          </div>
          <div className="info">
            <button hidden= {!permissionsCheck("Config change", "write")} disabled={buttonsDisabled} onClick={ () => this.refreshRepo('templates')}>
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
