import React from "react";
import DryRunProgressBar from "./DryRunProgressBar";
import DryRunProgressInfo from "./DryRunProgressInfo";
import DryRunError from "./DryRunError";
import { Form, Checkbox } from "semantic-ui-react";

class DryRun extends React.Component {
  state = {
    "resync": false
  };

  checkboxChangeHandler = (event, data) => {
    this.setState({ [data.name]: data.checked }, () => { 
      console.log("resync:" + this.state.resync);
    });
  };

  dryrunButtonOnclick = (e) => {
    this.props.dryRunSyncStart({"resync": this.state.resync});
    var confirmButtonElem = document.getElementById("dryrunButton");
    confirmButtonElem.disabled = true;
  };

  render() {
    let dryRunProgressData = this.props.dryRunProgressData;
    let dryRunJobStatus = this.props.dryRunJobStatus;
    let jobId = this.props.jobId;
    let error = "";

    if (dryRunJobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [
        <DryRunError
          dryRunSyncStart={this.props.dryRunSyncStart}
          dryRunProgressData={dryRunProgressData}
          devices={this.props.devices}
          resync={this.props.resync}
        />
      ];
    }

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Dry run (2/4)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
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
              <button id="dryrunButton" onClick={e => this.dryrunButtonOnclick(e)}>
                Start config dry run
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
