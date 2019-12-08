import React from "react";

class ConfigChangeStep3 extends React.Component {
  approveDiff = () => {
    return console.log("you approved diff");
  };

  rejectDiff = () => {
    return console.log("you rejected diff");
  };

  render() {
    console.log("these are props in step 3", this.props);
    let devicesObj = this.props.devices;
    console.log("this is devicesObj", devicesObj);
    let dryRunChangeScore = this.props.dryRunChangeScore;

    return (
      <div className="workflow-container">
        <div className="workflow-container__header">
          <h2>Verify difference (3/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div className="workflow-collapsable">
          <p>Step 3 of 4: Look through and verify diff</p>
          <div>
            <p>Total change score: {dryRunChangeScore}</p>
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

export default ConfigChangeStep3;
