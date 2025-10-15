import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Icon } from "semantic-ui-react";
import checkResponseStatus from "../utils/checkResponseStatus";

const io = require("socket.io-client");

let socket = null;

function FirmwareCopyForm(props) {
  const [copyJobId, setCopyJobId] = useState(null);
  const [copyJobStatus, setCopyJobStatus] = useState(null);
  const [removeDisabled, setRemoveDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const submitCopy = async () => {
    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on("connect", function () {
      console.log("Websocket connected!");
      socket.emit("events", { update: "job" });
    });
    socket.on("events", (data) => {
      if (data.job_id !== undefined && data.job_id == copyJobId) {
        if (data.status == "FINISHED" || data.status == "EXCEPTION") {
          setCopyJobStatus(data.status);
        }
      }
    });

    const url = `${process.env.API_URL}/api/v1.0/firmware`;
    const dataToSend = {
      url: process.env.FIRMWARE_REPO_URL + props.filename,
      sha1: props.sha1sum,
      verify_tls: true,
    };

    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
      body: JSON.stringify(dataToSend),
    });
    response = await checkResponseStatus(response);
    const data = await response.json();
    if (data.job_id !== undefined && typeof data.job_id === "number") {
      setCopyJobId(data.job_id);
      setCopyJobStatus("RUNNING");
    } else {
      console.log("error when submitting firmware post job", data.job_id);
    }
  };

  const submitDelete = async (e) => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware/${props.filename}`;

    try {
      let response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials}`,
        },
      });
      response = await checkResponseStatus(response);
      await response.json();
      setRemoveDisabled(true);
    } catch (error) {
      setErrorMessage("Error when deleting firmware: " + error.message);
    }
  };

  const submitSetDefault = async () => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware/${props.filename}/set-default`;

    try {
      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials}`,
        },
      });
      response = await checkResponseStatus(response);
      await response.json();
      if (props.getFirmwareFiles) {
        props.getFirmwareFiles();
      }
    } catch (error) {
      setErrorMessage("Error when setting default firmware: " + error.message);
    }
  };

  let copyDisabled = false;
  if (copyJobId !== null) {
    copyDisabled = true;
  } else if (!props.sha1sum) {
    copyDisabled = true;
  }

  const ret = [];
  if (errorMessage) {
    ret.push(<p key="error">{errorMessage}</p>);
  }
  if (props.already_downloaded) {
    if (props.isDefaultFirmware) {
      ret.push(
        <p key="default_message">
          This firmware is a default firmware for one or more device types
          during ZTP.
        </p>,
      );
    } else {
      ret.push(
        <div key="btngroup">
          <Button.Group vertical labeled icon>
            <Button
              key="delete"
              disabled={removeDisabled}
              onClick={() => submitDelete()}
            >
              Delete <Icon name="trash alternate outline" />
            </Button>
            <Button
              key="set_default"
              onClick={() => submitSetDefault()}
              compact
            >
              Set as default <Icon name="star" color="blue" />
            </Button>
          </Button.Group>
        </div>,
      );
    }
  } else {
    ret.push(
      <div key="btngroup">
        <Button.Group vertical labeled icon>
          <Button
            key="copy"
            disabled={copyDisabled}
            onClick={() => submitCopy()}
          >
            Copy to NMS <Icon name="cloud download" />
          </Button>
        </Button.Group>
      </div>,
    );
    if (copyJobId !== null);
    if (copyJobStatus !== null) {
      ret.push(
        <p key="status">
          Copy job id #{copyJobId} status: {copyJobStatus}
        </p>,
      );
    }
  }
  return ret;
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
