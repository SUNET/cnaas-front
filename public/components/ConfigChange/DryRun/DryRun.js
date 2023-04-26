import React from "react";
import DryRunProgressBar from "./DryRunProgressBar";
import DryRunProgressInfo from "./DryRunProgressInfo";
import DryRunError from "./DryRunError";
import { Form, Checkbox } from "semantic-ui-react";

class DryRun extends React.Component {
  state = {
    "resync": false,
    "dryrunButtonDisabled": false
  };

  checkboxChangeHandler = (event, data) => {
    this.setState({ [data.name]: data.checked }, () => { 
      console.log("resync:" + this.state.resync);
    });
  };

  dryrunButtonOnclick() {
    this.props.dryRunSyncStart({"resync": this.state.resync});
    this.setState({"dryrunButtonDisabled": true});
  };

  resetButtonOnclick() {
    this.props.resetState();
    this.setState({"dryrunButtonDisabled": false});
  }

  render() {
    let dryRunProgressData = this.props.dryRunProgressData;
    let dryRunJobStatus = this.props.dryRunJobStatus;
    let jobId = this.props.jobId;
    let error = "";
    let dryrunButtonDisabled = this.state.dryrunButtonDisabled;
    let resetButtonDisabled = true;

    if (dryRunJobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [
        <DryRunError
          dryRunSyncStart={this.props.dryRunSyncStart}
          dryRunProgressData={dryRunProgressData}
          devices={this.props.devices}
          resync={this.state.resync}
        />
      ];
    }
    if (dryRunJobStatus === "FINISHED") {
      resetButtonDisabled = false;
    }
    if (this.props.repoWorkingState === true) {
      dryrunButtonDisabled = true;
    }

    return (
      <div className="task-container">
        <div className="heading">
          <h2 id="dry_run_section">Dry run (2/4)</h2>
        </div>
        <div className="task-collapsable">
          <p>
            Step 2 of 4: Sending generated configuration to devices to calculate
            diff and check sanity
          </p>
          <Form>
            <div className="info">
              <Checkbox label="Re-sync devices (check for local changes made outside of NMS)" name="resync" checked={this.state.resync} onChange={this.checkboxChangeHandler} /> 
            </div>
            <div className="info">
              <button id="dryrunButton" disabled={dryrunButtonDisabled} onClick={() => this.dryrunButtonOnclick()}>
                Start config dry run
              </button>
              <button id="resetButton" disabled={resetButtonDisabled} onClick={() => this.resetButtonOnclick()}>
                Start over
              </button>
            </div>
          </Form>
          <DryRunProgressBar
            dryRunJobStatus={dryRunJobStatus}
            dryRunProgressData={dryRunProgressData}
            totalDevices={this.props.totalCount}
          />
          <DryRunProgressInfo
            dryRunJobStatus={dryRunJobStatus}
            dryRunProgressData={dryRunProgressData}
            jobId={jobId}
            logLines={this.props.logLines}
          />
        </div>
        {error}
      </div>
    );
  }
}

export default DryRun;
