import PropTypes from "prop-types";
import React from "react";
import { Progress } from "semantic-ui-react";

function ProgressBar({ jobStatus, value, total, hidden }) {
  let active = false;
  let disabled = true;
  let success = false;
  let error = false;

  if (jobStatus !== undefined) {
    switch (jobStatus) {
      case "SCHEDULED":
        disabled = false;
        break;
      case "RUNNING":
        disabled = false;
        active = true;
        break;
      case "FINISHED":
        if (value == total) {
          success = true;
        } else {
          error = true;
        }
        break;
      case "EXCEPTION":
        error = true;
        break;
      case null:
        disabled = true;
        break;
      case "":
        disabled = true;
        break;
      default:
        console.error(`unrecognized job status: ${jobStatus}`);
    }
  }

  return (
    <div id="progressbar" hidden={hidden}>
      <Progress
        value={value}
        total={total}
        progress
        precision={0}
        color="orange"
        disabled={disabled}
        active={active}
        success={success}
        error={error}
      />
      <label>
        {value}/{total} devices finished
      </label>
    </div>
  );
}

ProgressBar.propTypes = {
  jobStatus: PropTypes.string,
  value: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  hidden: PropTypes.bool,
};

ProgressBar.defaultProps = {
  jobStatus: null,
  hidden: false,
};

export default ProgressBar;
