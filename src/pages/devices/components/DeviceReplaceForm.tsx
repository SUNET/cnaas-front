import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useState } from "react";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import type { DeviceType } from "../../../types/device";
import {
  fetchDiscoveredDevices,
  fetchLldpNeighbors,
  initDevice,
} from "../api/deviceListApi";
import { DeviceInitCheckModal } from "./actionModals/DeviceInitCheckModal";

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
    const jobId = response.job_id;
    if (typeof jobId !== "number" || !Number.isFinite(jobId)) {
      console.error(
        "Device replace succeeded without a valid numeric job_id",
        response,
      );
      return;
    }
    jobIdCallback(deviceId, jobId);
    jobIdCallback(candidateDeviceId, jobId);
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
                label: { color: "success.main", empty: true, circular: true },
              }
            : {
                key: candidate.id,
                value: candidate.id,
                text: `ID ${candidate.id} / SN ${candidate.serial} / Model ${candidate.model}`,
                label: { color: "error.main", empty: true, circular: true },
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

  const onChangeCandidate = (event: SelectChangeEvent) => {
    const candidateId = event.target.value;
    if (candidateId === "") {
      clearCandidate();
      setReplacementCandidateId(null);
      return;
    }
    setReplacementCandidateId(Number(candidateId));
  };

  const submitInit = () => {
    if (replacementCandidateId === null) return;
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
      <span>
        <CircularProgress size="1em" /> Making sure old device is not still
        alive...
      </span>
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
    <FormControl fullWidth>
      <InputLabel id="replacement-candidate-label-id">
        Select replacement candidate
      </InputLabel>
      <Select
        labelId="replacement-candidate-label-id"
        label="Select replacement candidate"
        key={`replacement-candidate-${hostname}`}
        onChange={onChangeCandidate}
        value={
          replacementCandidateId === null ? "" : String(replacementCandidateId)
        }
        sx={{ mb: 1 }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {replacementCandidates.map((option) => (
          <MenuItem key={option.key} value={String(option.value)}>
            <FiberManualRecordIcon
              fontSize="small"
              sx={{ color: option.label.color, mr: 1 }}
            />
            {option.text}
          </MenuItem>
        ))}
      </Select>
      {replacementCandidateId !== null && (
        <DeviceInitCheckModal
          submitInit={submitInit}
          deviceId={replacementCandidateId}
          hostname={hostname}
          deviceType={deviceType}
          mlagPeerHostname={null}
          mlagPeerId={null}
          replaceHostname
        />
      )}
    </FormControl>
  );
}
