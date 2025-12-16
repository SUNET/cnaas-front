import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Select, Loader } from "semantic-ui-react";
import { getData } from "../../utils/getData";
import DeviceInitcheckModal from "./DeviceInitcheckModal";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { postData } from "../../utils/sendData";

async function submitInitJob(
  token,
  candidate_device_id,
  device_id,
  hostname,
  device_type,
  jobIdCallback,
) {
  const url = `${process.env.API_URL}/api/v1.0/device_init/${candidate_device_id}`;
  const dataToSend = {
    hostname,
    device_type,
    replace_hostname: true,
  };

  try {
    const response = await postData(url, token, dataToSend);
    if (response.job_id !== undefined && typeof response.job_id === "number") {
      jobIdCallback(device_id, response.job_id);
      jobIdCallback(candidate_device_id, response.job_id);
    } else {
      console.log("error when submitting device_init job", response.job_id);
    }
  } catch (error) {
    console.error("Error submitting device init job:", error);
  }
}

function DeviceReplaceForm({
  hostname,
  deviceType,
  deviceId,
  deviceModel,
  jobIdCallback,
  clearCandidate,
}) {
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [submitIcon, setSubmitIcon] = useState("window restore outline");
  const [submitText, setSubmitText] = useState("Initialize...");
  const [replacementCandidates, setReplacementCandidates] = useState([]);
  const [replacementCandidateId, setReplacementCandidateId] = useState(null);
  const [deviceAlive, setDeviceAlive] = useState(null);
  const { token } = useAuthToken();

  const getReplacementCandidates = async (prevModel) => {
    try {
      const data = await getData(
        `${process.env.API_URL}/api/v1.0/devices?filter[state]=DISCOVERED&per_page=100`,
        token,
      );
      const candidates = [];
      for (const candidate of data.data.devices) {
        if (candidate.model === prevModel) {
          candidates.push({
            key: candidate.id,
            value: candidate.id,
            text: `ID ${candidate.id} / MAC ${candidate.ztp_mac} / SN ${candidate.serial}`,
            label: { color: "green", empty: true, circular: true },
          });
        } else {
          candidates.push({
            key: candidate.id,
            value: candidate.id,
            text: `ID ${candidate.id} / SN ${candidate.serial} / Model ${candidate.model}`,
            label: { color: "red", empty: true, circular: true },
          });
        }
      }
      setReplacementCandidates(candidates);
    } catch {
      setReplacementCandidates([]);
    }
  };

  useEffect(() => {
    // Check if the old device is still alive, if so, do not allow replacement
    async function checkDeviceAlive() {
      try {
        const response = await getData(
          `${process.env.API_URL}/api/v1.0/device/${hostname}/lldp_neighbors`,
          token,
        );
        const status = response.status;
        if (status === "success") {
          setDeviceAlive(true);
        } else {
          throw new Error("API returned error status");
        }
      } catch {
        setDeviceAlive(false);
        getReplacementCandidates(deviceModel);
      }
    }
    checkDeviceAlive();
  }, []);

  const onChangeCandidate = (e, data) => {
    if (data.value === "") {
      clearCandidate();
    }
    setReplacementCandidateId(data.value);
  };

  const submitInit = () => {
    console.log(`init submitted: ${hostname} id: ${replacementCandidateId}`);
    setSubmitDisabled(true);
    setSubmitIcon("cog");
    setSubmitText("Initializing...");

    submitInitJob(
      token,
      replacementCandidateId,
      deviceId,
      hostname,
      deviceType,
      jobIdCallback,
    );
  };

  if (deviceAlive === null) {
    return (
      <Loader active inline>
        Making sure old device is not still alive...
      </Loader>
    );
  } else if (deviceAlive === true) {
    return (
      <p>
        Device is still alive, cannot replace. Please disconnect the old device
        before proceeding.
      </p>
    );
  } else {
    return (
      <div>
        <Select
          key="replacement_candidate"
          placeholder="Select replacement candidate"
          clearable
          onChange={onChangeCandidate}
          options={replacementCandidates}
        />
        <DeviceInitcheckModal
          submitDisabled={submitDisabled}
          submitText={submitText}
          submitIcon={submitIcon}
          submitInit={submitInit}
          deviceId={replacementCandidateId}
          hostname={hostname}
          device_type={deviceType}
          mlag_init={false}
          mlag_peer_hostname={null}
          mlag_peer_id={null}
        />
      </div>
    );
  }
}

DeviceReplaceForm.propTypes = {
  hostname: PropTypes.string,
  deviceType: PropTypes.string,
  deviceId: PropTypes.number,
  deviceModel: PropTypes.string,
  jobIdCallback: PropTypes.func,
  clearCandidate: PropTypes.func,
};

export default DeviceReplaceForm;
