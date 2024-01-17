import React from "react";
import { Input, Popup, Icon, Confirm, Select } from 'semantic-ui-react';
import DryRunProgressBar from "./DryRun/DryRunProgressBar";
import DryRunProgressInfo from "./DryRun/DryRunProgressInfo";
import { getData } from "../../utils/getData";

class ConfigChangeStep4 extends React.Component {
  state = {
    confirmDiagOpen: false,
    confirmModeDefault: -1,
    confirmMode: -1,
    job_comment: "",
    job_ticket_ref: "",
    expanded: true
  };
  confirmModeOptions = [
    {'value': -1, 'text': "use server default commit confirm mode"},
    {'value': 0, 'text': "mode 0: no confirm"},
    {'value': 1, 'text': "mode 1: per-device confirm"},
    {'value': 2, 'text': "mode 2: per-job confirm"},
  ]; 

  toggleExpand = (e, props) => {
    this.setState({expanded: !this.state.expanded});
  }

  openConfirm = () => { this.setState({confirmDiagOpen: true}) };
  closeConfirm = () => { this.setState({confirmDiagOpen: false}) };
  okConfirm = () => {
    this.setState({confirmDiagOpen: false});
    this.props.liveRunSyncStart({"dry_run": false, "comment": this.state.job_comment, "ticket_ref": this.state.job_ticket_ref, "confirm_mode": this.state.confirmMode});
    var confirmButtonElem = document.getElementById("confirmButton");
    confirmButtonElem.disabled = true;
  };

  updateComment = (e, data) => {
    this.setState({
      job_comment: data.value
    });
  }

  updateTicketRef = (e, data) => {
    this.setState({
      job_ticket_ref: data.value
    });
  }

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
            confirmModeDefault: data['api']['COMMIT_CONFIRMED_MODE'],
            confirmMode: data['api']['COMMIT_CONFIRMED_MODE'],
          });
          this.confirmModeOptions.map((option, index) => {
            if (option.value == data['api']['COMMIT_CONFIRMED_MODE']) {
              let newOption = option;
              newOption.text = option.text + " (server default)";
              this.confirmModeOptions[index] = newOption;
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
      val = this.state.confirmModeDefault;
    }
    this.setState({
      confirmMode: val
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
      if (!this.state.job_ticket_ref && !this.state.job_comment) {
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
          <h2>
            <Icon name='dropdown' onClick={this.toggleExpand} rotated={this.state.expanded?null:"counterclockwise"} />
            Commit configuration (4/4)
            <Popup
              content="This will send the newly generated configurations to the targeted devices and activate it. It's a good idea to describe the change or give a ticket reference so you can understand what was the intention when looking in the job history log."
              trigger={<Icon name="question circle outline" size="small" />}
              wide="very"
              />
          </h2>
        </div>
        <div className="task-collapsable" hidden={!this.state.expanded}>
          <p>Step 4 of 4: Final step, commit new configuration to devices</p>
          <p>Describe the change:</p>
          <div className="info">
          <Input placeholder="comment"
            maxLength="255"
            className="job_comment"
            error={!this.state.job_ticket_ref && !this.state.job_comment}
            onChange={this.updateComment}
          />
          </div>
          <p>Enter service ticket ID reference:</p>
          <Input placeholder="ticket reference"
            maxLength="32"
            className="job_ticket_ref"
            error={!this.state.job_ticket_ref && !this.state.job_comment}
            onChange={this.updateTicketRef}
          />
          <br />
          <button id="confirmButton" disabled={commitButtonDisabled} onClick={e => this.openConfirm(e)}>
           Deploy change (live run)
          </button> {warnings}
          <Select
            disabled={this.state.confirmModeDefault == -1}
            placeholder="commit confirm mode (use server default)"
            options={this.confirmModeOptions}
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
          <p hidden={this.state.confirmMode != 2}>Confirm progress: </p>
          <DryRunProgressBar
            hidden={this.state.confirmMode != 2}
            dryRunJobStatus={confirmJobStatus}
            dryRunProgressData={confirmRunProgressData}
            totalDevices={this.props.totalCount}
            keyNum={2}
          />
          <DryRunProgressInfo
            hidden={this.state.confirmMode != 2}
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
