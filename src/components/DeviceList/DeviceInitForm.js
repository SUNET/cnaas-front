import { useState } from "react";
import PropTypes from "prop-types";
import { Select, Input } from "semantic-ui-react";
import checkResponseStatus from "../../utils/checkResponseStatus";
import { getData } from "../../utils/getData";
import DeviceInitcheckModal from "./DeviceInitcheckModal";

async function submitInitJob(
  device_id,
  hostname,
  device_type,
  jobIdCallback,
  mlag_peer_hostname = null,
  mlag_peer_id = null,
) {
  console.log("Starting device init");
  const credentials = localStorage.getItem("token");
  const url = `${process.env.API_URL}/api/v1.0/device_init/${device_id}`;
  const dataToSend = {
    hostname,
    device_type,
  };
  if (mlag_peer_hostname !== null && mlag_peer_id !== null) {
    dataToSend.mlag_peer_hostname = mlag_peer_hostname;
    dataToSend.mlag_peer_id = mlag_peer_id;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
      body: JSON.stringify(dataToSend),
    });
    const checkedResponse = await checkResponseStatus(response);
    const data = await checkedResponse.json();
    console.log("device_init response data", data);
    if (data.job_id !== undefined && typeof data.job_id === "number") {
      jobIdCallback(device_id, data.job_id);
    } else {
      console.log("error when submitting device_init job", data.job_id);
    }
  } catch (error) {
    console.error("Error submitting device init job:", error);
  }
}

function DeviceInitForm({ deviceId, jobIdCallback }) {
  const [hostname, setHostname] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [submitIcon, setSubmitIcon] = useState("window restore outline");
  const [submitText, setSubmitText] = useState("Initialize...");
  const [deviceType, setDeviceType] = useState(null);
  const [mlagInit, setMlagInit] = useState(false);
  const [mlagPeerHostname, setMlagPeerHostname] = useState(null);
  const [mlagPeerId, setMlagPeerId] = useState(null);
  const [mlagPeerCandidates, setMlagPeerCandidates] = useState([]);

  const updateHostname = (e) => {
    setHostname(e.target.value);
  };

  const updatePeerHostname = (e) => {
    setMlagPeerHostname(e.target.value);
  };

  const getMlagPeerCandidates = async () => {
    const credentials = localStorage.getItem("token");
    try {
      const data = await getData(
        `${process.env.API_URL}/api/v1.0/devices?filter[state]=DISCOVERED&per_page=100`,
        credentials,
      );
      console.log("this should be mlag peer candidate data", data);
      const candidates = data.data.devices
        .filter((value) => value.id !== deviceId)
        .map((value) => ({
          key: value.id,
          value: value.id,
          text: `ID ${value.id} / MAC ${value.ztp_mac} / SN ${value.serial}`,
        }));
      setMlagPeerCandidates(candidates);
      console.log("mlag peer candidates", candidates);
    } catch (error) {
      console.error("Error fetching MLAG peer candidates:", error);
      setMlagPeerCandidates([]);
    }
  };

  const onChangeDevicetype = (e, data) => {
    if (data.value === "ACCESSMLAG") {
      getMlagPeerCandidates();
      setDeviceType("ACCESS");
      setMlagInit(true);
    } else {
      setDeviceType(data.value);
      setMlagInit(false);
    }
  };

  const onChangePeerdevice = (e, data) => {
    setMlagPeerId(data.value);
  };

  const submitInit = () => {
    console.log(`init submitted: ${hostname} id: ${deviceId}`);
    setSubmitDisabled(true);
    setSubmitIcon("cog");
    setSubmitText("Initializing...");

    if (mlagInit) {
      submitInitJob(
        deviceId,
        hostname,
        deviceType,
        jobIdCallback,
        mlagPeerHostname,
        mlagPeerId,
      );
    } else {
      submitInitJob(deviceId, hostname, deviceType, jobIdCallback);
    }
  };

  let mlagInputs = null;
  if (mlagInit) {
    mlagInputs = [
      <Select
        key="mlag_peer_id"
        placeholder="peer device"
        onChange={onChangePeerdevice}
        options={mlagPeerCandidates}
      />,
      <Input
        key="mlag_peer_hostname"
        placeholder="peer hostname"
        onChange={updatePeerHostname}
      />,
    ];
  }

  return (
    <div>
      <Input key="hostname" placeholder="hostname" onChange={updateHostname} />
      <Select
        key="device_type"
        placeholder="Device type"
        onChange={onChangeDevicetype}
        options={[
          { key: "ACCESS", value: "ACCESS", text: "Access" },
          {
            key: "ACCESSMLAG",
            value: "ACCESSMLAG",
            text: "Access MLAG pair",
          },
          { key: "DIST", value: "DIST", text: "Distribution" },
          { key: "CORE", value: "CORE", text: "Core" },
        ]}
      />
      {mlagInputs}
      <DeviceInitcheckModal
        submitDisabled={submitDisabled}
        submitText={submitText}
        submitIcon={submitIcon}
        submitInit={submitInit}
        deviceId={deviceId}
        hostname={hostname}
        device_type={deviceType}
        mlag_peer_hostname={mlagPeerHostname}
        mlag_peer_id={mlagPeerId}
      />
    </div>
  );
}

DeviceInitForm.propTypes = {
  deviceId: PropTypes.number,
  jobIdCallback: PropTypes.func,
};

export default DeviceInitForm;
