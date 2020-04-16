import React from "react";
import DryRunFailList from "./DryRunFailList";

class DryRunError extends React.Component {
  render() {
    return (
      <div>
        <DryRunFailList devices={this.props.devices} />
        <div>
          <button onClick={e => this.props.dryRunSyncStart()}>
            Retry
          </button>
          <button onClick={e => this.props.dryRunSyncStart({"force": true})}>
            Force retry
          </button>
        </div>
      </div>
    );
  }
}

export default DryRunError;
