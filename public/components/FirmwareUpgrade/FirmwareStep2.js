import React from "react";
import FirmwareProgressBar from "./FirmwareProgressBar";
import FirmwareProgressInfo from "./FirmwareProgressInfo";
import getData from "../../utils/getData";
import FirmwareError from "./FirmwareError";
import { Form, Select } from "semantic-ui-react";

class FirmwareStep2 extends React.Component {
  state = {
    filename: null,
    firmware_options: [],
    firmware_locked: false
  };

  updateFilename(e, option) {
    if (this.state.firmware_locked === false) {
      const val = option.value;
      this.setState({
        filename: val
      });
    }
  }

  onClickStep2 = (e) => {
    this.setState({firmware_locked: true});
    this.props.firmwareUpgradeStart(2, this.state.filename);
    var confirmButtonElem = document.getElementById("step2button");
    confirmButtonElem.disabled = true;
  };

  getFirmwareFiles() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/firmware";
    getData(url, credentials).then(data => {
      console.log("this should be data", data);
      {
        var firmware_options = data.data.files.map((filename, index) => {
          return {'key': index, 'value': filename, 'text': filename};
        })
        this.setState(
          {
            firmware_options: firmware_options
          },
          () => {
            console.log("this is new state", this.state.firmwareInfo);
          }
        );
      }
    });
  }

  componentDidMount() {
    this.getFirmwareFiles();
  }

  render() {
    let jobData = this.props.jobData;
    let jobStatus = this.props.jobStatus;
    let jobId = this.props.jobId;
    let jobFinishedDevices = this.props.jobFinishedDevices;
    let error = "";

    if (jobStatus === "EXCEPTION") {
      // console.log("jobStatus errored");
      error = [
        <FirmwareError
          devices={this.props.jobResult.devices}
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
            <Select
              placeholder="filename"
              options={this.state.firmware_options}
              onChange={this.updateFilename.bind(this)}
              disabled={this.state.firmware_locked}
            />
            <div className="info">
              <button id="step2button" onClick={e => this.onClickStep2(e)}>
                Start activate firmware
              </button>
            </div>
          </Form>
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
