import React from "react";

class ProgressBar extends React.Component {
  render() {
    return (
      <div>
        <div id="progressbar">
          <progress min="0" max="100" value={this.props.value}></progress>
          <label>
            {this.props.value}/{this.props.total} devices finished
          </label>
        </div>
      </div>
    );
  }
}

export default ProgressBar;
