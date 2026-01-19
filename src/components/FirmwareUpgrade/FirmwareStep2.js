import React from "react";
import { Form, Confirm, Select } from "semantic-ui-react";
import { FirmwareProgressBar } from "./FirmwareProgressBar";
import { FirmwareProgressInfo } from "./FirmwareProgressInfo";
import { getData } from "../../utils/getData";
import { FirmwareError } from "./FirmwareError";

class FirmwareStep2 extends React.Component {
  state = {
    filename: null,
    firmware_options: [],
    firmware_locked: false,
    firmware_selected: false,
    confirmDiagOpen: false,
  };

  openConfirm = () => {
    this.setState({ confirmDiagOpen: true });
  };

  closeConfirm = () => {
    this.setState({ confirmDiagOpen: false });
  };

  okConfirm = () => {
    this.setState({ confirmDiagOpen: false, firmware_locked: true });
    this.props.skipStep2();
  };

  updateFilename(e, option) {
    if (this.state.firmware_locked === false) {
      const val = option.value;
      this.setState({
        filename: val,
      });
    }
    this.setState({ firmware_selected: true });
  }

  onClickStep2 = () => {
    this.setState({ firmware_locked: true });
    this.props.firmwareUpgradeStart(2, this.state.filename, null);
    const confirmButtonElem = document.getElementById("step2button");
    confirmButtonElem.disabled = true;
  };

  onClickStep2Abort = () => {
    this.props.firmwareUpgradeAbort(2);
    const confirmButtonElem = document.getElementById("step2abortButton");
    confirmButtonElem.disabled = true;
  };

  getFirmwareFiles() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware`;
    getData(url, credentials).then((data) => {
      console.log("this should be data", data);
      {
        const firmware_options = [];
        data.data.files.forEach((filename, index) => {
          if (
            process.env.ARISTA_DETECT_ARCH !== undefined &&
            process.env.ARISTA_DETECT_ARCH === "true"
          ) {
            // build combined entry for both 32+64bit images if both are found
            if (
              filename.startsWith("EOS64-") &&
              data.data.files.includes(`EOS${filename.substring(5)}`)
            ) {
              firmware_options.push({
                key: index,
                value: `detect_arch-${filename}`,
                text: `${filename.substring(6)} (32+64bit)`,
                icon: "circle",
              });
            } else if (
              filename.startsWith("EOS-") &&
              data.data.files.includes(`EOS64${filename.substring(3)}`)
            ) {
              // corresponding 64bit image found, don't show 32bit image
            } else if (filename.startsWith("EOS")) {
              firmware_options.push({
                key: index,
                value: filename,
                text: `${filename} (not dual-arch)`,
                icon: "adjust",
                disabled: true,
              });
            } else {
              firmware_options.push({
                key: index,
                value: filename,
                text: filename,
                icon: "circle",
              });
            }
          } else {
            firmware_options.push({
              key: index,
              value: filename,
              text: filename,
            });
          }
        });
        this.setState(
          {
            firmware_options,
          },
          () => {
            console.log("this is new state", this.state.firmwareInfo);
          },
        );
      }
    });
  }

  componentDidMount() {
    this.getFirmwareFiles();
  }

  render() {
    const { jobData } = this.props;
    const { jobStatus } = this.props;
    const { jobId } = this.props;
    const { jobFinishedDevices } = this.props;
    let error = "";
    let step2abortDisabled = true;
    let step2disabled = true;

    if (jobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [<FirmwareError devices={this.props.jobResult.devices} />];
    } else if (jobStatus === "RUNNING" || jobStatus === "SCHEDULED") {
      step2abortDisabled = false;
    }

    if (this.state.firmware_selected === false) {
      step2disabled = true;
    } else if (this.state.firmware_locked === true) {
      step2disabled = true;
    } else {
      step2disabled = false;
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
            Step 2 of 3: Download firmware to device and activate it for next
            reboot
          </p>
          <Form>
            <Select
              placeholder="filename"
              options={this.state.firmware_options}
              onChange={this.updateFilename.bind(this)}
              disabled={this.state.firmware_locked}
            />
            <div className="info">
              <button
                id="step2button"
                disabled={step2disabled}
                onClick={() => this.onClickStep2()}
              >
                Start activate firmware
              </button>
              <button
                id="step2skipButton"
                disabled={step2disabled}
                onClick={(e) => this.openConfirm(e)}
              >
                Skip to step 3
              </button>
              <button
                id="step2abortButton"
                disabled={step2abortDisabled}
                onClick={() => this.onClickStep2Abort()}
              >
                Abort!
              </button>
            </div>
          </Form>
          <Confirm
            content="Are you sure all selected devices already have the target firmware downloaded and activated?"
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

export default FirmwareStep2;
