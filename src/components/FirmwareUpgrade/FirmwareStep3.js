import React from "react";
import { Form, Confirm, Input } from "semantic-ui-react";
import FirmwareProgressBar from "./FirmwareProgressBar";
import FirmwareProgressInfo from "./FirmwareProgressInfo";
import FirmwareError from "./FirmwareError";

const dateRegEx = new RegExp(
  "^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})?$",
);

class FirmwareStep3 extends React.Component {
  state = {
    job_started: false,
    confirmDiagOpen: false,
    startAt: "",
    startAtError: false,
  };

  openConfirm = () => {
    this.setState({ confirmDiagOpen: true });
  };

  closeConfirm = () => {
    this.setState({ confirmDiagOpen: false });
  };

  okConfirm = () => {
    this.setState({ confirmDiagOpen: false });
    this.setState({ job_started: true });
    this.props.firmwareUpgradeStart(3, this.props.filename, this.state.startAt);
  };

  onClickStep3Abort = (e) => {
    this.props.firmwareUpgradeAbort(3);
    const confirmButtonElem = document.getElementById("step3abortButton");
    confirmButtonElem.disabled = true;
  };

  onUpdateStartAt = (e) => {
    const val = e.target.value;
    this.setState({
      startAt: val,
    });
    if (dateRegEx.test(val)) {
      this.setState({ startAtError: false });
    } else {
      this.setState({ startAtError: true });
    }
  };

  render() {
    const { jobData } = this.props;
    const { jobStatus } = this.props;
    const { jobId } = this.props;
    const { jobFinishedDevices } = this.props;
    let error = "";
    let disableStartButton = true;
    let step3abortDisabled = true;

    if (jobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [<FirmwareError devices={this.props.jobResult.devices} />];
    } else if (jobStatus === "RUNNING" || jobStatus === "SCHEDULED") {
      step3abortDisabled = false;
    }

    if (this.state.job_started === true) {
      disableStartButton = true;
    } else if (this.state.startAtError === true) {
      disableStartButton = true;
    } else if (this.props.activateStep3 === true) {
      disableStartButton = false;
    }

    return (
      <div className="task-container">
        <div className="heading">
          <h2>Reboot devices (3/3)</h2>
          <a href="#">
            <button className="close">Close</button>
          </a>
        </div>
        <div className="task-collapsable">
          <p>
            Step 3 of 3: Reboot devices and check that they start with new
            firmware
          </p>
          <Input
            label={{ basic: true, content: "UTC" }}
            labelPosition="right"
            placeholder="2020-01-30 03:00:00"
            error={this.state.startAtError}
            onChange={this.onUpdateStartAt.bind(this)}
            value={this.state.startAt}
            disabled={this.state.job_started}
          />{" "}
          If left empty devices will reboot immediately
          <Form>
            <div className="info">
              <button
                id="step3button"
                onClick={(e) => this.openConfirm(e)}
                disabled={disableStartButton}
              >
                Start reboots
              </button>
              <button
                id="step3abortButton"
                disabled={step3abortDisabled}
                onClick={(e) => this.onClickStep3Abort(e)}
              >
                Abort!
              </button>
            </div>
          </Form>
          <Confirm
            content="Are you sure you want to (schedule) reboot devices?"
            open={this.state.confirmDiagOpen}
            onCancel={this.closeConfirm}
            onConfirm={this.okConfirm}
          />
          <FirmwareProgressBar
            jobStatus={jobStatus}
            jobFinishedDevices={jobFinishedDevices}
            totalCount={this.props.totalCount}
          />
          <FirmwareProgressInfo
            jobStatus={jobStatus}
            jobId={jobId}
            jobData={jobData}
            logLines={this.props.logLines}
          />
        </div>
        {error}
      </div>
    );
  }
}

export default FirmwareStep3;
