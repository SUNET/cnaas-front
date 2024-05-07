import React from "react";
import { Progress } from "semantic-ui-react";
import PropTypes from "prop-types";

class ProgressBar extends React.Component {
  render() {
    let active = false;
    let disabled = true;
    let success = false;
    let error = false;
    if (this.props.jobStatus !== undefined) {
      if (this.props.jobStatus === "SCHEDULED") {
        disabled = false;
      } else if (this.props.jobStatus === "RUNNING") {
        disabled = false;
        active = true;
      } else if (this.props.jobStatus === "FINISHED") {
        if (this.props.value == this.props.total) {
          success = true;
        } else {
          error = true;
        }
      } else if (this.props.jobStatus === "EXCEPTION") {
        error = true;
      }
    }

    return (
      <div>
        <div id="progressbar" hidden={this.props.hidden}>
          <Progress
            value={this.props.value}
            total={this.props.total}
            progress
            precision={0}
            color="orange"
            disabled={disabled}
            active={active}
            success={success}
            error={error}
          />
          <label>
            {this.props.value}/{this.props.total} devices finished
          </label>
        </div>
      </div>
    );
  }
}

ProgressBar.propTypes = {
  value: PropTypes.number,
  total: PropTypes.number,
  jobStatus: PropTypes.string,
  hidden: PropTypes.bool,
};

export default ProgressBar;
