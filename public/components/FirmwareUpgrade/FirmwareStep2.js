
import React from "react";
//import DryRunProgressBar from "./DryRunProgressBar";
//import DryRunProgressInfo from "./DryRunProgressInfo";
import FirmwareError from "./FirmwareError";
import { Form, Checkbox } from "semantic-ui-react";

class FirmwareStep2 extends React.Component {
  onClickStep2 = (e) => {
    this.props.firmwareUpgradeStart(2);
    var confirmButtonElem = document.getElementById("step2button");
    confirmButtonElem.disabled = true;
  };

  render() {
    let progressData = this.props.progressData;
    let jobStatus = this.props.jobStatus;
    let jobId = this.props.jobId;
    let error = "";

    if (jobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [
        <FirmwareError
          progressData={progressData}
          devices={this.props.devices}
        />
      ];
    }

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Activate firmware (2/3)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
        </div>
        <div className="task-collapsable">
          <p>
            Step 2 of 3: Download firmware to device and activate it for next reboot
          </p>
          <Form>
            <div className="info">
              <button id="step2button" onClick={e => this.onClickStep2(e)}>
                Start activate firmware
              </button>
            </div>
          </Form>
        </div>
        {error}
      </div>
    );
  }
}

export default FirmwareStep2;
