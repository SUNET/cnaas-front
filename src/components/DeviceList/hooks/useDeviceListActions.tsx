import { useNavigate } from "react-router";

import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { updateDevice, updateDeviceFacts } from "../api/deviceListApi";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import type { Device, DeviceState } from "../../../types/device";
import type { MgmtDomain } from "../../../types/mgmtDomain";

export type DeviceListActions = {
  readonly addDeviceJob: (deviceId: number, jobId: number) => void;
  readonly buildLog: (deviceId: number) => { [id: string]: string[] };
  readonly buildNetboxLookups: (device: Device) => {
    readonly model: unknown;
    readonly netboxDevice: unknown;
  };
  readonly changeStateAction: (
    deviceId: number,
    state: DeviceState,
  ) => Promise<void>;
  readonly changeStateLocally: (deviceId: number, state: DeviceState) => void;
  readonly configurePortsAction: (hostname: string) => void;
  readonly handleDeleteModalOpen: (device: Device) => void;
  readonly handleDeviceStateModalOpen: (
    hostname: string,
    deviceId: number,
    newState: DeviceState,
  ) => void;
  readonly handleHostnameModalOpen: (
    deviceId: number,
    hostname: string,
  ) => void;
  readonly handleMgmtAddModalOpen: (
    deviceA: string,
    deviceBCandidates: readonly Device[],
  ) => void;
  readonly handleMgmtUpdateModalOpen: (domain: MgmtDomain) => void;
  readonly handleShowConfigModalOpen: (
    hostname: string,
    state: DeviceState,
  ) => void;
  readonly syncDeviceAction: (hostname: string) => void;
  readonly updateFactsAction: (
    hostname: string,
    deviceId: number,
  ) => Promise<void>;
  readonly upgradeDeviceAction: (hostname: string) => void;
};

/**
 * Action handlers for the DeviceList page. Pure (args) -> dispatch /
 * navigate / fetch — no JSX. JSX assembly lives in components
 * (DeviceActionsMenu, MgmtDomainButton, MlagButtons, ...).
 *
 * Page-level callbacks (URL writes via `handleFilterChange`) live on
 * <DeviceList> and are exposed through DeviceListPageActionsContext.
 */
export function useDeviceListActions(): DeviceListActions {
  const { token } = useAuthToken();
  const { state, dispatch } = useDeviceList();
  const { deviceJobs, logLines, netboxDeviceData, netboxModelData } = state;
  const navigate = useNavigate();

  const addDeviceJob = (deviceId: number, jobId: number) => {
    dispatch({ type: actions.ADD_DEVICE_JOB, deviceId, jobId });
  };

  const syncDeviceAction = (hostname: string) => {
    navigate(`/config-change?hostname=${hostname}`);
  };

  const upgradeDeviceAction = (hostname: string) => {
    navigate(`/firmware-upgrade?hostname=${hostname}`);
  };

  const configurePortsAction = (hostname: string) => {
    navigate(`/interface-config?hostname=${hostname}`);
  };

  const updateFactsAction = async (hostname: string, deviceId: number) => {
    const data = await updateDeviceFacts(hostname, token);
    addDeviceJob(deviceId, data.job_id);
  };

  const changeStateLocally = (deviceId: number, deviceState: DeviceState) => {
    dispatch({
      type: actions.PATCH_DEVICE_STATE,
      deviceId,
      state: deviceState,
    });
  };

  const changeStateAction = async (
    deviceId: number,
    deviceState: DeviceState,
  ) => {
    try {
      await updateDevice(
        deviceId,
        { state: deviceState, synchronized: false },
        token,
      );
    } catch (err) {
      console.log("error when updating state:", err);
      return;
    }
    // Reducer-pushing: API confirmed truth, write directly.
    // The PUT also sets synchronized:false, so mirror it locally to avoid
    // a stale "synchronized" flag until the next refetch/socket update.
    dispatch({
      type: actions.PATCH_DEVICE_STATE,
      deviceId,
      state: deviceState,
      synchronized: false,
    });
  };

  const handleDeleteModalOpen = (device: Device) => {
    dispatch({ type: actions.TOGGLE_DELETE_MODAL, isOpen: true, device });
  };

  const handleDeviceStateModalOpen = (
    hostname: string,
    deviceId: number,
    newState: DeviceState,
  ) => {
    dispatch({
      type: actions.TOGGLE_DEVICE_STATE_MODAL,
      isOpen: true,
      hostname,
      deviceId,
      newState,
    });
  };

  const handleShowConfigModalOpen = (
    hostname: string,
    deviceState: DeviceState,
  ) => {
    dispatch({
      type: actions.TOGGLE_SHOW_CONFIG_MODAL,
      isOpen: true,
      hostname,
      state: deviceState,
    });
  };

  const handleHostnameModalOpen = (deviceId: number, hostname: string) => {
    dispatch({
      type: actions.TOGGLE_CHANGE_HOSTNAME_MODAL,
      isOpen: true,
      deviceId,
      hostname,
    });
  };

  const handleMgmtAddModalOpen = (
    deviceA: string,
    deviceBCandidates: readonly Device[],
  ) => {
    dispatch({
      type: actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL,
      isOpen: true,
      deviceA,
      deviceBCandidates,
    });
  };

  const handleMgmtUpdateModalOpen = ({
    id,
    device_a: deviceA,
    device_b: deviceB,
    ipv4_gw: ipv4GW,
    ipv6_gw: ipv6GW,
    vlan,
  }: MgmtDomain) => {
    dispatch({
      type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL,
      isOpen: true,
      mgmtId: id,
      deviceA,
      deviceB,
      ipv4Initial: ipv4GW,
      ipv6Initial: ipv6GW,
      vlanInitial: vlan,
    });
  };

  const buildLog = (deviceId: number): { [id: string]: string[] } => {
    const jobIds = deviceJobs[deviceId];
    if (!jobIds || jobIds.length === 0) return {};
    const lines: string[] = [];
    for (const jobId of jobIds) {
      // Delimiter-aware match: avoid "job #10" picking up "job #100" lines.
      const needle = new RegExp(`job #${jobId}(?!\\d)`, "i");
      for (const line of logLines) {
        if (needle.test(line)) {
          lines.push(line);
        }
      }
    }
    return { [deviceId]: lines };
  };

  const buildNetboxLookups = (device: Device) => {
    const model =
      device.model && Object.hasOwn(netboxModelData, device.model)
        ? netboxModelData[device.model]
        : null;
    const netboxDevice = Object.hasOwn(netboxDeviceData, device.id)
      ? netboxDeviceData[device.id]
      : null;
    return { model, netboxDevice };
  };

  return {
    addDeviceJob,
    buildLog,
    buildNetboxLookups,
    changeStateAction,
    changeStateLocally,
    configurePortsAction,
    handleDeleteModalOpen,
    handleDeviceStateModalOpen,
    handleHostnameModalOpen,
    handleMgmtAddModalOpen,
    handleMgmtUpdateModalOpen,
    handleShowConfigModalOpen,
    syncDeviceAction,
    updateFactsAction,
    upgradeDeviceAction,
  };
}
