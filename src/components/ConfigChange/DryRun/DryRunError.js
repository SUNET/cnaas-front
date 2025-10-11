import React from "react";
import DryRunFailList from "./DryRunFailList";

class DryRunError extends React.Component {
  render() {
    return (
      <div>
        <DryRunFailList devices={this.props.devices} />
        <div>
          <button
            onClick={() =>
              this.props.dryRunSyncStart({ resync: this.props.resync })
            }
          >
            Retry
          </button>
          <button
            onClick={() =>
              this.props.dryRunSyncStart({
                force: true,
                resync: this.props.resync,
              })
            }
          >
            Force retry
          </button>
        </div>
      </div>
    );
  }
}

export default DryRunError;
