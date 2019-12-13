import React from "react";

class ConfigChangeStep4 extends React.Component {
  render() {
    return (
      <div className="workflow-container">
        <div className="workflow-container__header">
          <h2>Commit configuration (4/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div className="workflow-collapsable">
          <p>Step 4 of 4: Final step</p>
          <button id="confirm" onClick={e => this.props.dryRunSyncStart(e)}>
           Confirm commit
          </button>
        </div>
      </div>
    );
  }
}

export default ConfigChangeStep4;
