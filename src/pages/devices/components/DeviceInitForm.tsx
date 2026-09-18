import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, type ChangeEvent } from "react";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import { isDeviceType, type DeviceType } from "../../../types/device";
import { fetchDiscoveredDevices, initDevice } from "../api/deviceListApi";
import { DeviceInitCheckModal } from "./actionModals/DeviceInitCheckModal";

type DeviceInitFormProps = {
  readonly deviceId: number;
  readonly jobIdCallback: (deviceId: number, jobId: number) => void;
};

type MlagPeerOption = {
  readonly key: number;
  readonly value: number;
  readonly text: string;
};

async function submitInitJob(
  deviceId: number,
  hostname: string,
  deviceType: DeviceType,
  jobIdCallback: (deviceId: number, jobId: number) => void,
  token: string | null,
  mlagPeerHostname: string | null = null,
  mlagPeerId: number | null = null,
) {
  const payload = {
    hostname,
    device_type: deviceType,
    ...(mlagPeerHostname !== null && mlagPeerId !== null
      ? { mlag_peer_hostname: mlagPeerHostname, mlag_peer_id: mlagPeerId }
      : {}),
  };
  try {
    const response = await initDevice(deviceId, payload, token);
    const jobId = response.job_id;
    if (typeof jobId !== "number" || !Number.isFinite(jobId)) {
      console.error(
        "Device init succeeded without a valid numeric job_id",
        response,
      );
      return;
    }
    jobIdCallback(deviceId, jobId);
  } catch (error) {
    console.error("Error submitting device init job:", error);
  }
}

export function DeviceInitForm({
  deviceId,
  jobIdCallback,
}: DeviceInitFormProps) {
  const [hostname, setHostname] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const [mlagInit, setMlagInit] = useState(false);
  const [mlagPeerHostname, setMlagPeerHostname] = useState<string | null>(null);
  const [mlagPeerId, setMlagPeerId] = useState<number | null>(null);
  const [mlagPeerCandidates, setMlagPeerCandidates] = useState<
    readonly MlagPeerOption[]
  >([]);
  const { token } = useAuthToken();

  const updateHostname = (e: ChangeEvent<HTMLInputElement>) => {
    setHostname(e.target.value);
  };

  const updatePeerHostname = (e: ChangeEvent<HTMLInputElement>) => {
    setMlagPeerHostname(e.target.value);
  };

  const getMlagPeerCandidates = async () => {
    try {
      const devices = await fetchDiscoveredDevices(token, 100);
      const candidates: MlagPeerOption[] = devices
        .filter((value) => value.id !== deviceId)
        .map((value) => ({
          key: value.id,
          value: value.id,
          text: `ID ${value.id} / MAC ${value.ztp_mac} / SN ${value.serial}`,
        }));
      setMlagPeerCandidates(candidates);
    } catch (error) {
      console.error("Error fetching MLAG peer candidates:", error);
      setMlagPeerCandidates([]);
    }
  };

  const onChangeDevicetype = (event: SelectChangeEvent) => {
    const value = event.target.value;
    if (value === "ACCESSMLAG") {
      getMlagPeerCandidates();
      setDeviceType("ACCESS");
      setMlagInit(true);
    } else {
      setDeviceType(isDeviceType(value) ? value : null);
      setMlagInit(false);
    }
  };

  const onChangePeerdevice = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setMlagPeerId(value === "" ? null : Number(value));
  };

  const submitInit = () => {
    if (!deviceType) return;
    if (mlagInit) {
      submitInitJob(
        deviceId,
        hostname,
        deviceType,
        jobIdCallback,
        token,
        mlagPeerHostname,
        mlagPeerId,
      );
    } else {
      submitInitJob(deviceId, hostname, deviceType, jobIdCallback, token);
    }
  };

  const deviceTypeSelectValue =
    deviceType === null ? "" : mlagInit ? "ACCESSMLAG" : deviceType;

  return (
    // 2-column grid so each field's column stays the same size whether one
    // row (no MLAG) or two rows (MLAG) are shown, and the Initialize button
    // always sits on its own row below. Width itself is now bounded by the
    // parent DeviceInfoBlock's grid track, not a fixed value here.
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
        }}
      >
        <TextField
          key="hostname"
          size="small"
          label="Hostname"
          placeholder="Enter hostname"
          value={hostname}
          onChange={updateHostname}
          fullWidth
        />
        <FormControl size="small" fullWidth>
          <InputLabel id="device-type-label">Device type</InputLabel>
          <Select
            key="device_type"
            labelId="device-type-label"
            label="Device type"
            value={deviceTypeSelectValue}
            onChange={onChangeDevicetype}
          >
            <MenuItem value="ACCESS">Access</MenuItem>
            <MenuItem value="ACCESSMLAG">Access MLAG pair</MenuItem>
            <MenuItem value="DIST">Distribution</MenuItem>
            <MenuItem value="CORE">Core</MenuItem>
          </Select>
        </FormControl>
        {mlagInit && (
          <>
            <FormControl size="small" fullWidth>
              <InputLabel id="mlag-peer-device-label">Peer device</InputLabel>
              <Select
                key="mlag_peer_id"
                labelId="mlag-peer-device-label"
                label="Peer device"
                value={mlagPeerId === null ? "" : String(mlagPeerId)}
                onChange={onChangePeerdevice}
              >
                {mlagPeerCandidates.map((option) => (
                  <MenuItem key={option.key} value={String(option.value)}>
                    {option.text}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              key="mlag_peer_hostname"
              size="small"
              label="Peer hostname"
              value={mlagPeerHostname ?? ""}
              onChange={updatePeerHostname}
              fullWidth
            />
          </>
        )}
      </Box>
      <DeviceInitCheckModal
        disabled={
          !deviceType ||
          !hostname.trim() ||
          (mlagInit && (!mlagPeerHostname?.trim() || mlagPeerId == null))
        }
        submitInit={submitInit}
        deviceId={deviceId}
        hostname={hostname}
        deviceType={deviceType}
        mlagPeerHostname={mlagPeerHostname}
        mlagPeerId={mlagPeerId}
      />
    </Stack>
  );
}
