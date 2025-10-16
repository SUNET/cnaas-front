import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "semantic-ui-react";
import checkResponseStatus from "../utils/checkResponseStatus";
const io = require("socket.io-client");

let socket = null;

function FirmwareCopyForm(props) {
  const [copyJobId, setCopyJobId] = useState(null);
  const [copyJobStatus, setCopyJobStatus] = useState(null);
  const [removeDisabled, setRemoveDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const copyJobIdRef = useRef(copyJobId);

  useEffect(() => {
    copyJobIdRef.current = copyJobId;
  }, [copyJobId]);

  const submitCopy = async () => {
    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on("connect", function () {
      console.log("Websocket connected!");
      socket.emit("events", { update: "job" });
    });
    socket.on("events", (data) => {
      if (
        data?.job_id == copyJobIdRef.current &&
        (data.status == "FINISHED" || data.status == "EXCEPTION")
      ) {
        props.reloadFirmwareFiles();
        setCopyJobId(null);
        setCopyJobStatus(null);
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
      setRemoveDisabled(true);
      let response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials}`,
        },
      });
      response = await checkResponseStatus(response);
      await response.json();
      setRemoveDisabled(false);
      props.reloadFirmwareFiles();
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
      if (props.reloadFirmwareFiles) {
        props.reloadFirmwareFiles();
      }
    } catch (error) {
      setErrorMessage("Error when setting default firmware: " + error.message);
    }
  };

  const ret = [];
  if (errorMessage) {
    ret.push(<p key="error">{errorMessage}</p>);
  }
  if (props.already_downloaded) {
    if (props.defaultFirmware) {
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
            {!props?.linkedTo && (
              <Button
                key="set_default"
                onClick={() => submitSetDefault()}
                compact
              >
                Set as default <Icon name="star" color="blue" />
              </Button>
            )}
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
            disabled={copyJobId !== null || !props.sha1sum}
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
  defaultFirmware: PropTypes.string,
  linkedTo: PropTypes.string,
  reloadFirmwareFiles: PropTypes.func,
  //  jobIdCallback: PropTypes.func
};

export default FirmwareCopyForm;
