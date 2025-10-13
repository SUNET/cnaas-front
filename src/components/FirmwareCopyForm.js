import React from "react";
import PropTypes from "prop-types";
import { Button, Icon } from "semantic-ui-react";
import checkResponseStatus from "../utils/checkResponseStatus";

const io = require("socket.io-client");

let socket = null;

class FirmwareCopyForm extends React.Component {
  state = {
    copyJobId: null,
    copyJobStatus: null,
    removeDisabled: false,
  };

  submitCopy(e) {
    e.preventDefault();
    console.log(`copy submitted: ${this.props.filename}`);
    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on("connect", function () {
      console.log("Websocket connected!");
      socket.emit("events", { update: "job" });
    });
    socket.on("events", (data) => {
      console.log(data);
      if (data.job_id !== undefined && data.job_id == this.state.copyJobId) {
        if (data.status == "FINISHED" || data.status == "EXCEPTION") {
          this.setState({ copyJobStatus: data.status });
        }
      }
    });

    const url = `${process.env.API_URL}/api/v1.0/firmware`;
    const dataToSend = {
      url: process.env.FIRMWARE_REPO_URL + this.props.filename,
      sha1: this.props.sha1sum,
      verify_tls: true,
    };

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => response.json())
      .then((data) => {
        console.log("firmware post response data", data);
        if (data.job_id !== undefined && typeof data.job_id === "number") {
          this.setState({
            copyJobId: data.job_id,
            copyJobStatus: "RUNNING",
          });
        } else {
          console.log("error when submitting firmware post job", data.job_id);
        }
      });
  }

  submitDelete(e) {
    e.preventDefault();
    console.log(`remove submitted: ${this.props.filename}`);
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware/${this.props.filename}`;

    fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => response.json())
      .then((data) => {
        console.log("firmware delete response data", data);
        this.setState({
          removeDisabled: true,
        });
      });
  }

  submitSetDefault(e) {
    e.preventDefault();
    console.log(`set default submitted: ${this.props.filename}`);
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware/${this.props.filename}/set-default`;

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => response.json())
      .then((data) => {
        console.log("firmware set-default response data", data);
        this.props.getFirmwareFiles();
      });
  }

  render() {
    const ret = [];
    let copyDisabled = false;
    if (this.state.copyJobId !== null) {
      copyDisabled = true;
    } else if (!this.props.sha1sum) {
      copyDisabled = true;
    }
    if (this.props.already_downloaded) {
      if (this.props.isDefaultFirmware) {
        ret.push(
          <p key="default_warning" style={{ color: "red" }}>
            Warning: This firmware is a default firmware for one or more device
            types during ZTP. Deleting it may cause ZTP to fail for those device
            types.
          </p>,
        );
      } else {
        ret.push(
          <form key="delete" onSubmit={this.submitDelete.bind(this)}>
            <Button disabled={this.state.removeDisabled}>
              Delete <Icon name="trash alternate outline" />
            </Button>
          </form>
        );
        ret.push(
          <form key="set_default" onSubmit={this.submitSetDefault.bind(this)}>
            <Button>
              Set as default <Icon name="star" color="blue" />
            </Button>
          </form>
        );
      }
    } else {
      ret.push(
        <form key="button" onSubmit={this.submitCopy.bind(this)}>
          <Button disabled={copyDisabled}>
            Copy to NMS <Icon name="cloud download" />
          </Button>
        </form>
      );
      if (this.state.copyJobStatus !== null) {
        ret.push(
          <p key="status">
            Copy job id #{this.state.copyJobId} status: {this.state.copyJobStatus}
          </p>,
        );
      }
    }
    return ret;
  }
}

FirmwareCopyForm.propTypes = {
  filename: PropTypes.string,
  sha1sum: PropTypes.string,
  already_downloaded: PropTypes.bool,
  isDefaultFirmware: PropTypes.bool,
  getFirmwareFiles: PropTypes.func,
  //  jobIdCallback: PropTypes.func
};

export default FirmwareCopyForm;
