import React from "react";
import DryRunProgressBar from "./DryRunProgressBar";
import DryRunProgressInfo from "./DryRunProgressInfo";
import DryRunError from "./DryRunError";

class DryRun extends React.Component {
  render() {
    let dryRunProgressData = this.props.dryRunProgressData;
    let dryRunJobStatus = this.props.dryRunJobStatus;
    let error = "";

    if (dryRunJobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [
        <DryRunError
          dryRunSyncStart={this.props.dryRunSyncStart}
          dryRunProgressData={dryRunProgressData}
          devices={this.props.devices}
        />
      ];
    }

    return (
      <div>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Dry run (2/4)</h2>
            <a href="#">
              <button className="workflow-container__button--hide">
                Close
              </button>
            </a>
          </div>
          <div key="1" className="workflow-collapsable">
            <p>
              Step 2 of 4: Sending generated configuration to devices to
              calculate diff and check sanity
            </p>
            <div key="0" className="inner-content">
              <button key="0" onClick={e => this.props.dryRunSyncStart(e)}>
                Start config dry run
              </button>
            </div>
            <DryRunProgressBar
              dryRunJobStatus={dryRunJobStatus}
              dryRunProgressData={dryRunProgressData}
              totalDevices={this.props.totalPages}
            />
            <DryRunProgressInfo
              dryRunJobStatus={dryRunJobStatus}
              dryRunProgressData={dryRunProgressData}
            />
          </div>
          {error}
        </div>
      </div>
    );
  }
}

export default DryRun;
