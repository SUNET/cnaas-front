import React from "react";
import DryRunProgressBar from "./DryRun/DryRunProgressBar";
import DryRunProgressInfo from "./DryRun/DryRunProgressInfo";
import { Confirm } from 'semantic-ui-react';

class ConfigChangeStep4 extends React.Component {
  state = {
    confirmDiagOpen: false
  };

  openConfirm = () => { this.setState({confirmDiagOpen: true}) };
  closeConfirm = () => { this.setState({confirmDiagOpen: false}) };
  okConfirm = () => {
    this.setState({confirmDiagOpen: false});
    this.props.dryRunSyncStart({"dry_run": false});
    var confirmButtonElem = document.getElementById("confirmButton");
    confirmButtonElem.disabled = true;
  };

  componentDidMount() {
    // Ugly hack, this should be done via some confirmButton state in parent component
    var confirmButtonElem = document.getElementById("confirmButton");
    confirmButtonElem.disabled = true;
  };

  render() {
    let dryRunProgressData = this.props.dryRunProgressData;
    let dryRunJobStatus = this.props.dryRunJobStatus;

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Commit configuration (4/4)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
        </div>
        <div className="task-collapsable">
          <p>Step 4 of 4: Final step</p>
          <button id="confirmButton" onClick={e => this.openConfirm(e)}>
           Confirm commit
          </button>
          <Confirm
            content="Are you sure you want to commit changes to devices and overwrite any local changes?"
            open={this.state.confirmDiagOpen}
            onCancel={this.closeConfirm}
            onConfirm={this.okConfirm}
          />
          <DryRunProgressBar
            dryRunJobStatus={dryRunJobStatus}
            dryRunProgressData={dryRunProgressData}
            totalDevices={this.props.totalCount}
          />
          <DryRunProgressInfo
            dryRunJobStatus={dryRunJobStatus}
            dryRunProgressData={dryRunProgressData}
          />
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep4;
