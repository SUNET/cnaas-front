import { type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button, Dropdown } from "semantic-ui-react";

import { useAuthToken } from "../../../contexts/AuthTokenContext";
import {
  useDeviceList,
  useDeviceListPageActions,
} from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import { updateDevice, updateDeviceFacts } from "../api/deviceListApi";
import type { Device, DeviceState } from "../../../types/device";
import { isCoreDevice, isDistDevice } from "../../../types/device";
import type { MgmtDomain } from "../../../types/mgmtDomain";
import type { FilterData } from "../types/table";
import type { DeviceInterface } from "../types/deviceInterface";
import { getMenuActionsConfig } from "../utils";

export type DeviceListActions = {
  readonly addDeviceJob: (deviceId: number, jobId: number) => void;
  readonly buildLog: (deviceId: number) => { [id: string]: string[] };
  readonly buildMenuActions: (device: Device) => ReactNode;
  readonly buildButtonsExtra: (device: Device) => ReactNode;
  readonly buildNetboxLookups: (device: Device) => {
    readonly model: unknown;
    readonly netboxDevice: unknown;
  };
  readonly changeStateLocally: (deviceId: number, state: DeviceState) => void;
  readonly handleHostnameModalOpen: (
    deviceId: number,
    hostname: string,
  ) => void;
};

/**
 * Bundles every action handler needed by the expanded-row leaves.
 *
 * Page-level callbacks (URL writes via `handleFilterChange`) live on
 * <DeviceList> and are exposed through DeviceListPageActionsContext so
 * leaves stay self-contained without prop-drilling.
 */
export function useDeviceListActions(): DeviceListActions {
  const { token } = useAuthToken();
  const { state, dispatch } = useDeviceList();
  const { handleFilterChange } = useDeviceListPageActions();
  const {
    deviceData,
    deviceInterfaceData,
    deviceJobs,
    logLines,
    mgmtDomainsData,
    netboxDeviceData,
    netboxModelData,
  } = state;
  const navigate = useNavigate();

  const addDeviceJob = (deviceId: number, jobId: number) => {
    dispatch({ type: actions.ADD_DEVICE_JOB, deviceId, jobId });
  };

  const findAction = (filter: FilterData, expandDeviceId: number | null) => {
    handleFilterChange(filter, expandDeviceId);
    globalThis.scrollTo(0, 0);
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
    if (data.job_id !== undefined && typeof data.job_id === "number") {
      addDeviceJob(deviceId, data.job_id);
    } else {
      console.log("error when submitting device_update_facts job", data.job_id);
    }
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
    const data = await updateDevice(
      deviceId,
      { state: deviceState, synchronized: false },
      token,
    );
    if (data.status !== "success") {
      console.log("error when updating state:", data.error);
      return;
    }
    // Reducer-pushing: API confirmed truth, write directly.
    dispatch({
      type: actions.PATCH_DEVICE_STATE,
      deviceId,
      state: deviceState,
    });
  };

  const handleDeleteModalOpen = (device: Device) => {
    dispatch({ type: actions.OPEN_DELETE_MODAL, device });
  };

  const handleDeviceStateModalOpen = (
    hostname: string,
    deviceId: number,
    newState: DeviceState,
  ) => {
    dispatch({
      type: actions.OPEN_DEVICE_STATE_MODAL,
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
      type: actions.OPEN_SHOW_CONFIG_MODAL,
      hostname,
      state: deviceState,
    });
  };

  const handleHostnameModalOpen = (deviceId: number, hostname: string) => {
    dispatch({ type: actions.OPEN_CHANGE_HOSTNAME_MODAL, deviceId, hostname });
  };

  const handleMgmtAddModalOpen = (
    deviceA: string,
    deviceBCandidates: Device[],
  ) => {
    dispatch({
      type: actions.OPEN_ADD_MGMT_DOMAIN_MODAL,
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
      type: actions.OPEN_UPDATE_MGMT_DOMAIN_MODAL,
      mgmtId: id,
      deviceA,
      deviceB,
      ipv4Initial: ipv4GW,
      ipv6Initial: ipv6GW,
      vlanInitial: vlan,
    });
  };

  const buildMenuActions = (device: Device): ReactNode => {
    const handlers = {
      changeStateAction,
      changeStateLocally,
      configurePortsAction,
      handleDeleteModalOpen,
      handleDeviceStateModalOpen,
      handleShowConfigModalOpen,
      handleShowHostnameModal: handleHostnameModalOpen,
      syncDeviceAction,
      updateFactsAction,
      upgradeDeviceAction,
    };
    return getMenuActionsConfig(device, handlers).map((action) => (
      <Dropdown.Item
        key={action.key}
        text={action.text}
        onClick={action.onClick}
        disabled={action.disabled}
      />
    ));
  };

  const renderMlagButtons = (
    interfaces: readonly DeviceInterface[],
  ): ReactNode[] =>
    interfaces
      .filter((intf) => intf.configtype === "MLAG_PEER")
      .map((intf) => (
        <Button
          compact
          icon="exchange"
          key={intf.name}
          onClick={() =>
            findAction(
              { id: String(intf.data.neighbor_id ?? "") } as FilterData,
              intf.data.neighbor_id ?? null,
            )
          }
          title="Go to MLAG peer device"
          content={`${intf.name}: MLAG peer`}
        />
      ));

  const renderUplinkButtons = (
    interfaces: readonly DeviceInterface[],
  ): ReactNode[] =>
    interfaces
      .filter((intf) => intf.configtype === "ACCESS_UPLINK")
      .map((intf) => (
        <Button
          compact
          icon="arrow up"
          key={intf.name}
          onClick={() =>
            findAction(
              { hostname: intf.data.neighbor ?? "" } as FilterData,
              intf.data.neighbor_id ?? null,
            )
          }
          title="Go to uplink device"
          content={`${intf.name}: Uplink to ${intf.data.neighbor}`}
        />
      ));

  const getMgmtDomainsForHostname = (hostname: string) =>
    mgmtDomainsData.filter(
      (data) => hostname === data.device_a || hostname === data.device_b,
    );

  const renderMgmtDomainButton = (device: Device): ReactNode => {
    const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
    const owned = getMgmtDomainsForHostname(device.hostname);

    if (owned.length === 0) {
      const isCorrectType = (d: Device) =>
        d.device_type === "DIST" || (includeCore && d.device_type === "CORE");
      const candidates = deviceData
        .filter(isCorrectType)
        .filter((d) => getMgmtDomainsForHostname(d.hostname).length === 0);
      return (
        <Button
          compact
          icon="plus"
          key={`${device.id}_mgmgt_add`}
          onClick={() =>
            handleMgmtAddModalOpen(device.hostname, [...candidates])
          }
          content="Add management domain"
        />
      );
    }

    if (owned.length > 1) {
      throw new Error("multiple mgmt domains for device");
    }

    return (
      <Button
        compact
        icon="arrow up"
        key={`${device.id}_mgmgt_add`}
        onClick={() => handleMgmtUpdateModalOpen(owned[0])}
        content="Management domain"
      />
    );
  };

  const buildButtonsExtra = (device: Device): ReactNode => {
    const buttons: ReactNode[] = [];
    const interfaces = deviceInterfaceData[device.id];
    if (interfaces) {
      buttons.push(...renderMlagButtons(interfaces));
      buttons.push(...renderUplinkButtons(interfaces));
    }

    const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
    if (isDistDevice(device) || (includeCore && isCoreDevice(device))) {
      buttons.push(renderMgmtDomainButton(device));
    }

    if (buttons.length === 0) return null;
    return (
      <div key="btngroup">
        <Button.Group vertical labeled icon>
          {buttons}
        </Button.Group>
      </div>
    );
  };

  const buildLog = (deviceId: number): { [id: string]: string[] } => {
    const jobIds = deviceJobs[deviceId];
    if (!jobIds || jobIds.length === 0) return {};
    const lines: string[] = [];
    for (const jobId of jobIds) {
      const needle = `job #${jobId}`;
      for (const line of logLines) {
        if (line.toLowerCase().includes(needle)) {
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
    buildMenuActions,
    buildButtonsExtra,
    buildNetboxLookups,
    changeStateLocally,
    handleHostnameModalOpen,
  };
}
