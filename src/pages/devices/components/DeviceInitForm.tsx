import { useState, type ChangeEvent } from "react";
import { Select, Input, type DropdownProps } from "semantic-ui-react";
import { fetchDiscoveredDevices, initDevice } from "../api/deviceListApi";
import { DeviceInitCheckModal } from "./actionModals/DeviceInitCheckModal";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { type DeviceType, isDeviceType } from "../../../types/device";

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

  const onChangeDevicetype = (_e: unknown, data: DropdownProps) => {
    if (data.value === "ACCESSMLAG") {
      getMlagPeerCandidates();
      setDeviceType("ACCESS");
      setMlagInit(true);
    } else {
      setDeviceType(isDeviceType(data.value) ? data.value : null);
      setMlagInit(false);
    }
  };

  const onChangePeerdevice = (_e: unknown, data: DropdownProps) => {
    setMlagPeerId(typeof data.value === "number" ? data.value : null);
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
      {mlagInit && (
        <>
          <Select
            key="mlag_peer_id"
            placeholder="peer device"
            onChange={onChangePeerdevice}
            options={[...mlagPeerCandidates]}
          />
          <Input
            key="mlag_peer_hostname"
            placeholder="peer hostname"
            onChange={updatePeerHostname}
          />
        </>
      )}
      {deviceType && (
        <DeviceInitCheckModal
          disabled={
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
      )}
    </div>
  );
}
