import React from "react";
import DryRunProgressBar from "./DryRun/DryRunProgressBar";
import DryRunProgressInfo from "./DryRun/DryRunProgressInfo";
import { Confirm, Popup, Icon, Select } from 'semantic-ui-react';
import getData from "../../utils/getData";

class ConfigChangeStep4 extends React.Component {
  state = {
    confirmDiagOpen: false,
    commitModeDefault: -1,
    commitMode: -1
  };
  commitModeOptions = [
    {'value': -1, 'text': "use server default commit mode"},
    {'value': 0, 'text': "mode 0: no confirm"},
    {'value': 1, 'text': "mode 1: per-device confirm"},
    {'value': 2, 'text': "mode 2: per-job confirm"},
  ]; 

  openConfirm = () => { this.setState({confirmDiagOpen: true}) };
  closeConfirm = () => { this.setState({confirmDiagOpen: false}) };
  okConfirm = () => {
    this.setState({confirmDiagOpen: false});
    this.props.liveRunSyncStart({"dry_run": false, "commit_mode": this.state.commitMode});
    var confirmButtonElem = document.getElementById("confirmButton");
    confirmButtonElem.disabled = true;
  };

  componentDidMount() {
    // Ugly hack, this should be done via some confirmButton state in parent component
    var confirmButtonElem = document.getElementById("confirmButton");
    confirmButtonElem.disabled = true;
    // Get default commit confirmed mode
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/settings/server";
    getData(url, credentials).then(data =>
      {
        if (data['api']['COMMIT_CONFIRMED_MODE'] >= 0) {
          this.setState({
            commitModeDefault: data['api']['COMMIT_CONFIRMED_MODE'],
            commitMode: data['api']['COMMIT_CONFIRMED_MODE'],
          });
          this.commitModeOptions.map((option, index) => {
            if (option.value == data['api']['COMMIT_CONFIRMED_MODE']) {
              let newOption = option;
              newOption.text = option.text + " (server default)";
              this.commitModeOptions[index] = newOption;
            }
          })
        }
      }
    ).catch(error => {
      console.log("API does not support setteings/server to get default commit confirm mode")
    });
  };
  
  updateCommitMode(e, option) {
    let val = option.value;
    if (val == -1) {
      val = this.state.commitModeDefault;
    }
    this.setState({
      commitMode: val
    });
  }

  render() {
    let progressData = this.props.liveRunProgressData;
    let jobStatus = this.props.liveRunJobStatus;
    let jobId = this.props.jobId;
    let dryRunJobStatus = this.props.dryRunJobStatus;
    let confirmRunProgressData = this.props.confirmRunProgressData;
    let confirmJobId = this.props.confirmJobId;
    let confirmJobStatus = this.props.confirmRunJobStatus;
    let warnings = [];


    let commitButtonDisabled = true;
    if (dryRunJobStatus === "FINISHED") {
      if (jobStatus) {
        commitButtonDisabled = true;
      } else {
        commitButtonDisabled = false;
      }
    }

    if (!commitButtonDisabled) {
      if (!this.props.jobTicketRef && !this.props.jobComment) {
        warnings.push(
          <Popup
            key="popup1"
            content="Ticket reference and comment is missing"
            position="top center"
            hoverable
            trigger={<Icon name="warning circle" color="yellow" size="large" />}
          />
        );
      }
      const warnChangeScore = 90;
      if (this.props.dryRunChangeScore && this.props.dryRunChangeScore > warnChangeScore) {
        warnings.push(
          <Popup
            key="popup2"
            content={"High change score: "+this.props.dryRunChangeScore}
            position="top center"
            hoverable
            trigger={<Icon name="warning sign" color="orange" size="large" />}
          />
        );
      }
      if (this.props.synctoForce) {
        warnings.push(
          <Popup
            key="popup3"
            content={"Local changes will be overwritten!"}
            position="top center"
            hoverable
            trigger={<Icon name="warning sign" color="red" size="large" />}
          />
        );
      }
      if (warnings.length == 0) {
        warnings.push(
          <Popup
            key="popup4"
            content={"No warnings"}
            position="top center"
            hoverable
            trigger={<Icon name="checkmark box" color="green" size="large" />}
          />
        );
      }
    }

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Commit configuration (4/4)</h2>
        </div>
        <div className="task-collapsable">
          <p>Step 4 of 4: Final step</p>
          <button id="confirmButton" disabled={commitButtonDisabled} onClick={e => this.openConfirm(e)}>
           Confirm commit
          </button> {warnings}
          <Select
            disabled={this.state.commitModeDefault == -1}
            placeholder="commit mode (use server default)"
            options={this.commitModeOptions}
            onChange={this.updateCommitMode.bind(this)}
          />
          <Confirm
            content="Are you sure you want to commit changes to devices and overwrite any local changes?"
            open={this.state.confirmDiagOpen}
            onCancel={this.closeConfirm}
            onConfirm={this.okConfirm}
          />
          <DryRunProgressBar
            dryRunJobStatus={jobStatus}
            dryRunProgressData={progressData}
            totalDevices={this.props.totalCount}
            keyNum={1}
          />
          <DryRunProgressInfo
            dryRunJobStatus={jobStatus}
            dryRunProgressData={progressData}
            jobId={jobId}
            confirmJobId={confirmJobId}
            logLines={this.props.logLines}
            keyNum={1}
          />
          <p hidden={this.state.commitMode != 2}>Confirm progress: </p>
          <DryRunProgressBar
            hidden={this.state.commitMode != 2}
            dryRunJobStatus={confirmJobStatus}
            dryRunProgressData={confirmRunProgressData}
            totalDevices={this.props.totalCount}
            keyNum={2}
          />
          <DryRunProgressInfo
            hidden={this.state.commitMode != 2}
            dryRunJobStatus={confirmJobStatus}
            dryRunProgressData={confirmRunProgressData}
            jobId={confirmJobId}
            logLines={this.props.logLines}
            keyNum={2}
          />
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep4;
