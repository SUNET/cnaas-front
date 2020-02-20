import React from "react";
import VerifyDiffInfo from "./VerifyDiffInfo";
import VerifyDiffResult from "./VerifyDiffResult";

class VerifyDiff extends React.Component {
  approveDiff = () => {
    return console.log("you approved diff");
  };

  rejectDiff = () => {
    return console.log("you rejected diff");
  };

  render() {
    // console.log("these are props in step 3", this.props);
    let devicesObj = this.props.devices;
    const deviceNames = Object.keys(devicesObj);
    const deviceData = Object.values(devicesObj);

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Verify difference (3/4)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
        </div>
        <div className="task-collapsable">
          <p>Step 3 of 4: Look through and verify diff</p>
          <div>
            <VerifyDiffInfo
              deviceNames={deviceNames}
              dryRunChangeScore={this.props.dryRunChangeScore}
            />
            <VerifyDiffResult
              deviceNames={deviceNames}
              deviceData={deviceData}
            />
            <button key="1" onClick={this.approveDiff}>
              Approve
            </button>
            <button key="2" onClick={this.rejectDiff}>
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default VerifyDiff;
