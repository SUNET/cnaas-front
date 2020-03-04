import React from "react";

class ConfigChangeStep4 extends React.Component {
  render() {
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
          <button id="confirm" onClick={e => this.props.dryRunSyncStart(e, {})}>
           Confirm commit
          </button>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep4;
