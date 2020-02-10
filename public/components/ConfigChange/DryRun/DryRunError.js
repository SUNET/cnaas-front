import React from "react";
import DryRunFailList from "./DryRunFailList";

class DryRunError extends React.Component {
  render() {
    return (
      <div>
        <DryRunFailList devices={this.props.devices} />
        <div>
          <button key="1" onClick={e => this.props.dryRunSyncStart(e)}>
            Retry
          </button>
          <button
            id="force-button"
            key="2"
            onClick={e => this.props.dryRunSyncStart(e)}
          >
            Force retry
          </button>
        </div>
      </div>
    );
  }
}

export default DryRunError;
