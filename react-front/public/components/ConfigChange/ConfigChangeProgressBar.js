import React from "react";

class ConfigChangeProgressBar extends React.Component {
  state = {};
  // this could propably be a function
  render() {
    return (
      <div>
        <div id="progressbar">
          <progress
            min="0"
            max="100"
            value={this.props.finishedDevices}
          ></progress>
          <label>
            {this.props.finishedDevices}/{this.props.totalDevices} devices
            finished
          </label>
        </div>
      </div>
    );
  }
}

export default ConfigChangeProgressBar;
