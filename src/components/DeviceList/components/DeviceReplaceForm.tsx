import { useState, useEffect } from "react";
import {
  Select,
  Loader,
  type DropdownProps,
  type SemanticICONS,
} from "semantic-ui-react";
import {
  fetchDiscoveredDevices,
  fetchLldpNeighbors,
  initDevice,
} from "../api/deviceListApi";
import { DeviceInitCheckModal } from "./actionModals/DeviceInitCheckModal";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import type { DeviceType } from "../../../types/device";

type DeviceReplaceFormProps = {
  readonly hostname: string;
  readonly deviceType: DeviceType;
  readonly deviceId: number;
  readonly deviceModel: string | null | undefined;
  readonly jobIdCallback: (deviceId: number, jobId: number) => void;
  readonly clearCandidate: () => void;
};

type CandidateOption = {
  readonly key: number;
  readonly value: number;
  readonly text: string;
  readonly label: { color: string; empty: boolean; circular: boolean };
};

async function submitInitJob(
  token: string | null,
  candidateDeviceId: number,
  deviceId: number,
  hostname: string,
  deviceType: DeviceType,
  jobIdCallback: (deviceId: number, jobId: number) => void,
) {
  try {
    const response = await initDevice(
      candidateDeviceId,
      {
        hostname,
        device_type: deviceType,
        replace_hostname: true,
      },
      token,
    );
    jobIdCallback(deviceId, response.job_id);
    jobIdCallback(candidateDeviceId, response.job_id);
  } catch (error) {
    console.error("Error submitting device init job:", error);
  }
}

export function DeviceReplaceForm({
  hostname,
  deviceType,
  deviceId,
  deviceModel,
  jobIdCallback,
  clearCandidate,
}: DeviceReplaceFormProps) {
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [submitIcon, setSubmitIcon] = useState<SemanticICONS>(
    "window restore outline",
  );
  const [submitText, setSubmitText] = useState("Initialize...");
  const [replacementCandidates, setReplacementCandidates] = useState<
    readonly CandidateOption[]
  >([]);
  const [replacementCandidateId, setReplacementCandidateId] = useState<
    number | null
  >(null);
  const [deviceAlive, setDeviceAlive] = useState<boolean | null>(null);
  const { token } = useAuthToken();

  useEffect(() => {
    let cancelled = false;

    const getReplacementCandidates = async () => {
      try {
        const devices = await fetchDiscoveredDevices(token, 100);
        if (cancelled) return;
        const candidates: CandidateOption[] = devices.map((candidate) =>
          candidate.model === deviceModel
            ? {
                key: candidate.id,
                value: candidate.id,
                text: `ID ${candidate.id} / MAC ${candidate.ztp_mac} / SN ${candidate.serial}`,
                label: { color: "green", empty: true, circular: true },
              }
            : {
                key: candidate.id,
                value: candidate.id,
                text: `ID ${candidate.id} / SN ${candidate.serial} / Model ${candidate.model}`,
                label: { color: "red", empty: true, circular: true },
              },
        );
        setReplacementCandidates(candidates);
      } catch {
        if (!cancelled) setReplacementCandidates([]);
      }
    };

    const checkDeviceAlive = async () => {
      try {
        const response = await fetchLldpNeighbors(hostname, token);
        if (cancelled) return;
        if (response.status === "success") {
          setDeviceAlive(true);
        } else {
          throw new Error("API returned error status");
        }
      } catch {
        if (cancelled) return;
        setDeviceAlive(false);
        getReplacementCandidates();
      }
    };

    checkDeviceAlive();
    return () => {
      cancelled = true;
    };
  }, [hostname, deviceModel, token]);

  const onChangeCandidate = (_e: unknown, data: DropdownProps) => {
    if (data.value === "") {
      clearCandidate();
      setReplacementCandidateId(null);
      return;
    }
    setReplacementCandidateId(
      typeof data.value === "number" ? data.value : null,
    );
  };

  const submitInit = () => {
    if (replacementCandidateId === null) return;
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
  }
  if (deviceAlive) {
    return (
      <p>
        Device is still alive, cannot replace. Please disconnect the old device
        before proceeding.
      </p>
    );
  }
  return (
    <div>
      <Select
        key="replacement_candidate"
        placeholder="Select replacement candidate"
        clearable
        onChange={onChangeCandidate}
        options={[...replacementCandidates]}
      />
      {replacementCandidateId !== null && (
        <DeviceInitCheckModal
          submitDisabled={submitDisabled}
          submitText={submitText}
          submitIcon={submitIcon}
          submitInit={submitInit}
          deviceId={replacementCandidateId}
          hostname={hostname}
          deviceType={deviceType}
          mlagPeerHostname={null}
          mlagPeerId={null}
        />
      )}
    </div>
  );
}
