import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import {
  Button,
  Dropdown,
  Grid,
  GridColumn,
  GridRow,
  Pagination,
  Table,
} from "semantic-ui-react";

import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import type { FilterData, SortDirection } from "../types/table";
import type { DeviceInterface } from "../types/deviceInterface";
import {
  fetchDeviceById,
  fetchDeviceInterfaces,
  fetchDevicesPage,
  fetchMgmtDomains,
  updateDevice,
  updateDeviceFacts,
} from "../api/deviceListApi";
import type { Device, DeviceState } from "../../../types/device";
import { isCoreDevice, isDistDevice } from "../../../types/device";
import type { MgmtDomain } from "../../../types/mgmtDomain";

import { DeviceInfoBlock } from "./DeviceInfoBlock";
import { DeviceInitForm } from "./DeviceInitForm";
import { UpdateMgmtDomainModal } from "./actionModals/UpdateMgmtDomainModal";
import { DeviceReplaceForm } from "./DeviceReplaceForm";
import { DeviceTableBody } from "./DeviceTableBody";
import { DeviceTableButtonGroup } from "./DeviceTableButtonGroup";
import { DeviceTableHeader } from "./DeviceTableHeader";
import { getMenuActionsConfig } from "../utils";
import { AddMgmtDomainModal } from "./actionModals/AddMgmtDomainModal";
import { DeleteModal } from "./actionModals/DeleteModal";
import { HostnameModal } from "./actionModals/HostnameModal";
import { ShowConfigModal } from "./actionModals/ShowConfigModal";
import { DeviceStateModal } from "./actionModals/DeviceStateModal";

import { COLUMN_MAP, type DeviceColumnKey } from "../types/columns";

// --- Local types ---

export function DeviceList() {
  const { token } = useAuthToken();
  const { state: deviceListState, dispatch } = useDeviceList();
  const {
    deviceData,
    filterData,
    filterActive,
    sortColumn,
    sortDirection,
    activePage,
    activeColumns,
    resultsPerPage,
    totalPages,
    mgmtDomainsData,
    deviceInterfaceData,
    netboxModelData,
    netboxDeviceData,
    deviceJobs,
    logLines,
    addMgmtDomainModal,
    deleteModal,
    deviceStateModal,
    updateMgmtDomainModal,
    showConfigModal,
    changeHostnameModal,
  } = deviceListState;

  const [searchParams, setSearchParams] = useSearchParams();

  // Page-fetch UI status — sole concern of <DeviceList>, kept local.
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Sync filter + expanded ids from URL to reducer.
    const locationFilterData: { [key: string]: string } = {};
    for (const [key, value] of searchParams.entries()) {
      const match = /^filter\[(.+)\]$/.exec(key);
      if (match) locationFilterData[match[1]] = value;
    }
    dispatch({ type: actions.SET_FILTER, filterData: locationFilterData });

    const expandParam = searchParams.get("expand");
    if (expandParam) {
      const deviceIds = expandParam
        .split(",")
        .map((raw) => Number.parseInt(raw, 10))
        .filter((id) => Number.isFinite(id));
      if (deviceIds.length > 0) {
        dispatch({ type: actions.EXPAND_DEVICES, deviceIds });
      }
    }
  }, [searchParams]);

  const getAllMgmtDomainsData = async (signal?: AbortSignal) => {
    try {
      const mgmtdomains = await fetchMgmtDomains(token, signal);
      dispatch({ type: actions.SET_MGMT_DOMAINS, mgmtDomains: mgmtdomains });
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const addDeviceJob = (deviceId: number, jobId: number) => {
    dispatch({ type: actions.ADD_DEVICE_JOB, deviceId, jobId });
  };

  const findAction = (
    filter: FilterData,
    expandDeviceId: number | null,
    closeToast: boolean,
  ) => {
    if (closeToast) {
      // close toast
      document
        .querySelectorAll(".ui.floating.message")
        .forEach((el) => el.remove());
    }
    handleFilterChange(filter, expandDeviceId);
    dispatch({
      type: actions.SET_FILTER_ACTIVE,
      active: Object.keys(filter).length > 0,
    });
    globalThis.scrollTo(0, 0);
  };

  const getDevices = async (signal?: AbortSignal) => {
    const operatorMap: { [key: string]: string } = {
      id: "[equals]",

      device_type: "[ilike]",
      state: "[ilike]",
      synchronized: "",
    };

    const urlParams: { [key: string]: string | number } = {
      page: activePage,
      per_page: resultsPerPage,
    };

    if (sortDirection && sortColumn) {
      const prefix = sortDirection === "ascending" ? "" : "-";
      urlParams.sort = `${prefix}${sortColumn}`;
    }

    for (const [key, value] of searchParams.entries()) {
      if (!value) continue; // skip empty values
      const match = /^filter\[(.+)\]$/.exec(key);
      if (!match) continue;
      const matchedKey = match[1];
      const operator = operatorMap[matchedKey] ?? "[contains]";
      urlParams[`filter[${matchedKey}]${operator}`] = value;
    }

    const filterString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(urlParams).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();

    try {
      const { devices, totalPages: pages } = await fetchDevicesPage(
        filterString,
        resultsPerPage,
        token,
        signal,
      );
      dispatch({ type: actions.SET_TOTAL_PAGES, pages });
      dispatch({ type: actions.SET_DEVICES, devices });
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      dispatch({ type: actions.SET_DEVICES, devices: [] });
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    getAllMgmtDomainsData(controller.signal);
    return () => controller.abort();
    // Mount-only fetch; helper closes over `token` but it's stable enough for initial load.
  }, []);

  // Update deviceData on changes
  useEffect(() => {
    const controller = new AbortController();
    getDevices(controller.signal);
    return () => controller.abort();
  }, [sortColumn, sortDirection, searchParams, activePage, resultsPerPage]);

  const sortClick = (column: string) => {
    let direction: SortDirection;
    if (column === sortColumn) {
      direction = sortDirection === "ascending" ? "descending" : "ascending";
    } else {
      direction = "descending";
    }
    dispatch({ type: actions.SET_SORT, column, direction });
  };

  const handleFilterColumnChange = (column: string, value: string) => {
    handleFilterChange({ ...filterData, [column]: value });
  };

  const handleFilterChange = (
    nextFilterData: FilterData,
    expandDeviceId: number | null = null,
  ) => {
    // Reset to page 1 during filtering
    dispatch({ type: actions.SET_ACTIVE_PAGE, page: 1 });
    dispatch({ type: actions.SET_FILTER, filterData: nextFilterData });
    // Set queryParams on filterData change
    const filterParams: { [key: string]: string } = Object.fromEntries(
      Object.entries(nextFilterData)
        .filter(([, value]) => value) // skip empty values
        .map(([key, value]) => [`filter[${key}]`, value]),
    );
    if (expandDeviceId != null) {
      filterParams.expand = String(expandDeviceId);
    }

    const newSearchParams = new URLSearchParams(filterParams);
    const newSearch = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : "";

    // Only push if it have changed
    // Do not push nothing
    if (newSearch && newSearch !== globalThis.location.search) {
      setSearchParams(newSearchParams);
    } else if (!newSearch && globalThis.location.search) {
      setSearchParams({});
    }
  };

  const handleAddMgmtDomains = (id: number) => {
    toast({
      type: "success",
      title: `Management domain ${id} added`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.CLOSE_ADD_MGMT_DOMAIN_MODAL });
  };

  const handleDeleteMgmtDomain = (id: number) => {
    toast({
      type: "success",
      title: `Management domain ${id} deleted`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.CLOSE_UPDATE_MGMT_DOMAIN_MODAL });
  };

  const handleUpdateMgmtDomains = (id: number) => {
    toast({
      type: "success",
      title: `Management domain ${id} updated`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.CLOSE_UPDATE_MGMT_DOMAIN_MODAL });
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

  const handleShowConfigModalOpen = (hostname: string, state: DeviceState) => {
    dispatch({ type: actions.OPEN_SHOW_CONFIG_MODAL, hostname, state });
  };

  const handleHostnameModalOpen = (deviceId: number, hostname: string) => {
    dispatch({ type: actions.OPEN_CHANGE_HOSTNAME_MODAL, deviceId, hostname });
  };

  const hasJobId = (jobId: number) => {
    return function (logLine: string) {
      return logLine.toLowerCase().includes(`job #${jobId}`);
    };
  };

  const renderMlagLink = (interfaceData: readonly DeviceInterface[]) => {
    return interfaceData
      .filter((intf) => intf.configtype === "MLAG_PEER")
      .map((intf) => {
        return (
          <Button
            compact
            icon="exchange"
            key={intf.name}
            onClick={() =>
              findAction(
                { id: String(intf.data.neighbor_id ?? "") } as FilterData,
                intf.data.neighbor_id ?? null,
                false,
              )
            }
            title="Go to MLAG peer device"
            content={`${intf.name}: MLAG peer`}
          />
        );
      });
  };

  const renderUplinkLink = (interfaceData: readonly DeviceInterface[]) => {
    return interfaceData
      .filter((intf) => intf.configtype === "ACCESS_UPLINK")
      .map((intf) => {
        return (
          <Button
            compact
            icon="arrow up"
            key={intf.name}
            onClick={() =>
              findAction(
                { hostname: intf.data.neighbor ?? "" } as FilterData,
                intf.data.neighbor_id ?? null,
                false,
              )
            }
            title="Go to uplink device"
            content={`${intf.name}: Uplink to ${intf.data.neighbor}`}
          />
        );
      });
  };

  const getMgmgtDomainForDevice = (hostname: string) => {
    return mgmtDomainsData.filter(
      (data) => hostname === data.device_a || hostname === data.device_b,
    );
  };

  const renderMgmtDomainsButton = (device: Device): ReactNode => {
    const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
    const mgmtDomainForDevice = getMgmgtDomainForDevice(device.hostname);
    const isCorrectDeviceType = (dev: Device) =>
      dev.device_type === "DIST" || (includeCore && dev.device_type === "CORE");
    const isNotInMgmgtDomain = (dev: Device) =>
      !getMgmgtDomainForDevice(dev.hostname).length;
    if (!mgmtDomainForDevice.length) {
      const deviceBCandidates: Device[] = [
        ...deviceData.filter(isCorrectDeviceType).filter(isNotInMgmgtDomain),
      ];
      return (
        <Button
          compact
          icon="plus"
          key={`${device.id}_mgmgt_add`}
          onClick={() =>
            handleMgmtAddModalOpen(device.hostname, deviceBCandidates)
          }
          content="Add management domain"
        />
      );
    }

    if (mgmtDomainForDevice.length > 1) {
      throw new Error("multiple mgmt domains for device");
    }

    return (
      <Button
        compact
        icon="arrow up"
        key={`${device.id}_mgmgt_add`}
        onClick={() => handleMgmtUpdateModalOpen(mgmtDomainForDevice[0])}
        content="Management domain"
      />
    );
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
    console.log(`Update facts for hostname: ${hostname}`);

    const data = await updateDeviceFacts(hostname, token);

    if (data.job_id !== undefined && typeof data.job_id === "number") {
      addDeviceJob(deviceId, data.job_id);
    } else {
      console.log("error when submitting device_update_facts job", data.job_id);
    }
  };

  const handleDeleteModalOpen = (device: Device) => {
    dispatch({ type: actions.OPEN_DELETE_MODAL, device });
  };

  const changeStateLocally = (deviceId: number, state: DeviceState) => {
    dispatch({ type: actions.PATCH_DEVICE_STATE, deviceId, state });
  };

  const changeStateAction = async (deviceId: number, state: DeviceState) => {
    const data = await updateDevice(
      deviceId,
      { state, synchronized: false },
      token,
    );

    if (data.status !== "success") {
      console.log("error when updating state:", data.error);
    }
    getDevices();
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

  const createDeviceButtonsExtraForDevice = (device: Device): ReactNode[] => {
    const deviceButtons: ReactNode[] = [];

    if (device.id in deviceInterfaceData) {
      const mlagPeerLink = renderMlagLink(deviceInterfaceData[device.id]);
      if (mlagPeerLink !== null) {
        deviceButtons.push(...mlagPeerLink);
      }

      const uplinkLink = renderUplinkLink(deviceInterfaceData[device.id]);
      if (uplinkLink !== null) {
        deviceButtons.push(...uplinkLink);
      }
    }

    const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
    if (isDistDevice(device) || (includeCore && isCoreDevice(device))) {
      deviceButtons.push(renderMgmtDomainsButton(device));
    }

    return deviceButtons;
  };

  const mangleDeviceData = (device: Device): ReactNode => {
    const deviceStateExtra: ReactNode[] = [];
    if (device.state === "DISCOVERED") {
      deviceStateExtra.push(
        <DeviceInitForm
          key={`${device.id}_initform`}
          deviceId={device.id}
          jobIdCallback={addDeviceJob}
        />,
      );
    } else if (device.state === "INIT") {
      if (device.id in deviceJobs) {
        deviceStateExtra.push(
          <p key="initjobs">Init jobs: {deviceJobs[device.id].join(", ")}</p>,
        );
      }
    } else if (device.state === "UNMANAGED (Replacing)") {
      deviceStateExtra.push(
        <DeviceReplaceForm
          key={`${device.id}_replaceform`}
          hostname={device.hostname}
          deviceType={device.device_type}
          deviceId={device.id}
          deviceModel={device.model}
          jobIdCallback={addDeviceJob}
          clearCandidate={() => {
            changeStateLocally(device.id, "UNMANAGED");
          }}
        />,
      );
    }

    const deviceButtonsExtra = createDeviceButtonsExtraForDevice(device);
    if (deviceButtonsExtra.length > 0) {
      deviceStateExtra.push(
        <div key="btngroup">
          <Button.Group vertical labeled icon>
            {deviceButtonsExtra}
          </Button.Group>
        </div>,
      );
    }

    const log: { [deviceId: string]: string[] } = {};
    for (const deviceId of Object.keys(deviceJobs)) {
      log[deviceId] = [];

      for (const jobId of deviceJobs[deviceId]) {
        const filteredLines = logLines.filter(hasJobId(jobId));

        for (const logLine of filteredLines) {
          log[deviceId].push(logLine);
        }
      }
    }

    const model =
      device.model && Object.hasOwn(netboxModelData, device.model)
        ? netboxModelData[device.model]
        : null;

    const netboxDevice = Object.hasOwn(netboxDeviceData, device.id)
      ? netboxDeviceData[device.id]
      : null;

    return (
      <DeviceInfoBlock
        key={`${device.id}_device_info`}
        device={device}
        menuActions={createMenuActionsForDevice(device)}
        deviceStateExtra={deviceStateExtra}
        log={log}
        model={model}
        netboxDevice={netboxDevice}
      />
    );
  };

  const createMenuActionsForDevice = (device: Device): ReactNode[] => {
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

    const actionsConfig = getMenuActionsConfig(device, handlers);

    return actionsConfig.map((action) => (
      <Dropdown.Item
        key={action.key}
        text={action.text}
        onClick={action.onClick}
        disabled={action.disabled}
      />
    ));
  };

  const columnSelectorChange = (column: DeviceColumnKey) => {
    const newColumns: DeviceColumnKey[] = activeColumns.includes(column)
      ? activeColumns.filter((c) => c !== column)
      : [...activeColumns, column];

    newColumns.sort(
      (a, b) =>
        Object.keys(COLUMN_MAP).indexOf(a) - Object.keys(COLUMN_MAP).indexOf(b),
    );
    dispatch({ type: actions.SET_ACTIVE_COLUMNS, columns: newColumns });
  };

  return (
    <section>
      <Grid divided="vertically">
        <GridRow columns={2}>
          <GridColumn>
            <h2>Devices</h2>
          </GridColumn>
          <GridColumn textAlign="right" verticalAlign="bottom">
            <DeviceTableButtonGroup
              activeColumns={[...activeColumns]}
              setFilterActive={(value) => {
                const next =
                  typeof value === "function" ? value(filterActive) : value;
                dispatch({ type: actions.SET_FILTER_ACTIVE, active: next });
              }}
              handleFilterChange={handleFilterChange}
              columnSelectorChange={columnSelectorChange}
              resultsPerPage={resultsPerPage}
              setActivePage={(page) =>
                dispatch({ type: actions.SET_ACTIVE_PAGE, page })
              }
              setResultsPerPage={(perPage) =>
                dispatch({ type: actions.SET_RESULTS_PER_PAGE, perPage })
              }
              setSortColumn={(column) =>
                dispatch({
                  type: actions.SET_SORT,
                  column,
                  direction: sortDirection,
                })
              }
              setSortDirection={(direction) =>
                dispatch({
                  type: actions.SET_SORT,
                  column: sortColumn,
                  direction,
                })
              }
            />
          </GridColumn>
        </GridRow>
      </Grid>

      <SemanticToastContainer position="top-right" maxToasts={3} />

      <DeviceStateModal
        isOpen={deviceStateModal.isOpen}
        deviceId={deviceStateModal.deviceId}
        hostname={deviceStateModal.hostname}
        newState={deviceStateModal.newState}
        closeAction={() => dispatch({ type: actions.CLOSE_DEVICE_STATE_MODAL })}
        onStateChange={getDevices}
      />

      <DeleteModal
        key={deleteModal.device?.id || "deletemodal"}
        device={deleteModal.device}
        isOpen={deleteModal.isOpen}
        addDeviceJob={addDeviceJob}
        closeAction={() => dispatch({ type: actions.CLOSE_DELETE_MODAL })}
      />

      <AddMgmtDomainModal
        deviceA={addMgmtDomainModal.deviceA}
        deviceBCandidates={[...addMgmtDomainModal.deviceBCandidates]}
        isOpen={addMgmtDomainModal.isOpen}
        closeAction={() =>
          dispatch({ type: actions.CLOSE_ADD_MGMT_DOMAIN_MODAL })
        }
        onAdd={(v: number) => handleAddMgmtDomains(v)}
      />

      <UpdateMgmtDomainModal
        key={updateMgmtDomainModal.mgmtId ?? "new"}
        mgmtId={updateMgmtDomainModal.mgmtId}
        deviceA={updateMgmtDomainModal.deviceA}
        deviceB={updateMgmtDomainModal.deviceB}
        ipv4Initial={updateMgmtDomainModal.ipv4Initial}
        ipv6Initial={updateMgmtDomainModal.ipv6Initial}
        vlanInitial={updateMgmtDomainModal.vlanInitial}
        isOpen={updateMgmtDomainModal.isOpen}
        closeAction={() =>
          dispatch({ type: actions.CLOSE_UPDATE_MGMT_DOMAIN_MODAL })
        }
        onDelete={(v: number) => handleDeleteMgmtDomain(v)}
        onUpdate={(v: number) => handleUpdateMgmtDomains(v)}
      />
      <HostnameModal
        key={changeHostnameModal.deviceId ?? "hostnamemodal"}
        hostname={changeHostnameModal.hostname}
        deviceId={changeHostnameModal.deviceId}
        isOpen={changeHostnameModal.isOpen}
        closeAction={() =>
          dispatch({ type: actions.CLOSE_CHANGE_HOSTNAME_MODAL })
        }
        onSuccess={async (_oldHostname: string, newHostname: string) => {
          const deviceId = changeHostnameModal.deviceId;
          if (deviceId == null) return;
          try {
            const device = await fetchDeviceById(deviceId, token);
            dispatch({ type: actions.UPDATE_DEVICE, deviceId, device });
            const interfaces = await fetchDeviceInterfaces(newHostname, token);
            if (interfaces.length > 0) {
              dispatch({
                type: actions.CACHE_INTERFACES,
                deviceId,
                interfaces,
              });
            }
          } catch {
            // Swallow — UI keeps stale row; user can retry.
          }
        }}
      />
      <ShowConfigModal
        key={showConfigModal.hostname ?? "closed"}
        hostname={showConfigModal.hostname}
        state={showConfigModal.state}
        isOpen={showConfigModal.isOpen}
        closeAction={() => dispatch({ type: actions.CLOSE_SHOW_CONFIG_MODAL })}
      />
      <Table sortable celled striped>
        <DeviceTableHeader
          activeColumns={[...activeColumns]}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          filterActive={filterActive}
          filterData={filterData}
          sortClick={sortClick}
          handleFilterColumnChange={handleFilterColumnChange}
        />
        <DeviceTableBody
          deviceData={[...deviceData]}
          activeColumns={[...activeColumns]}
          loading={loading}
          error={error}
          mangleDeviceData={mangleDeviceData}
        />
      </Table>

      <Pagination
        activePage={activePage}
        totalPages={totalPages}
        boundaryRange={5}
        onPageChange={(_e, { activePage: nextPage }) =>
          dispatch({
            type: actions.SET_ACTIVE_PAGE,
            page: Number(nextPage),
          })
        }
      />
    </section>
  );
}
