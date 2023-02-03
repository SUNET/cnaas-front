import React from "react";
import DryRunProgressBar from "./DryRun/DryRunProgressBar";
import DryRunProgressInfo from "./DryRun/DryRunProgressInfo";
import { Confirm, Popup, Icon, Select } from 'semantic-ui-react';

class ConfigChangeStep4 extends React.Component {
  state = {
    confirmDiagOpen: false,
    commitMode: -1
  };

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
  };
  
  updateCommitMode(e, option) {
    const val = option.value;
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
    let commitModeOptions = [
      {'key': -1, 'value': -1, 'text': "default"},
      {'key': 0, 'value': 0, 'text': "mode 0 (no confirm)"},
      {'key': 1, 'value': 1, 'text': "mode 1 (per-device confirm)"},
      {'key': 2, 'value': 2, 'text': "mode 2 (per-job confirm)"},
    ];

    let commitButtonDisabled = true;
    if (dryRunJobStatus === "FINISHED") {
      if (jobStatus) {
        commitButtonDisabled = true;
      } else {
        commitButtonDisabled = false;
      }
    }

    if (!commitButtonDisabled) {
      if (!this.props.jobTicketRef || !this.props.jobComment) {
        warnings.push(
          <Popup
            key="popup1"
            content="Ticket reference or comment is missing"
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
            placeholder="commit mode"
            options={commitModeOptions}
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
