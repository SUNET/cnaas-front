import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { showToast } from "../../../components/toast";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import { extractErrorMessageAsync } from "../../../utils/extractErrorMessage";
import {
  fetchDeviceById,
  fetchDeviceInterfaces,
  fetchDevicesPage,
  fetchMgmtDomains,
} from "../api/deviceListApi";
import {
  DeviceListPageActionsProvider,
  useDeviceList,
} from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import {
  isDeviceColumnKey,
  type DeviceColumnKey,
  type FilterData,
} from "../types/table";
import { AddMgmtDomainModal } from "./actionModals/AddMgmtDomainModal";
import { DeleteModal } from "./actionModals/DeleteModal";
import { DeviceStateModal } from "./actionModals/DeviceStateModal";
import { HostnameModal } from "./actionModals/HostnameModal";
import { ShowConfigModal } from "./actionModals/ShowConfigModal";
import { UpdateMgmtDomainModal } from "./actionModals/UpdateMgmtDomainModal";
import { DeviceTableBody } from "./DeviceTableBody";
import { DeviceTableButtonGroup } from "./DeviceTableButtonGroup";
import { DeviceTableHeader } from "./DeviceTableHeader";

export function DeviceList() {
  const { token } = useAuthToken();
  const { state: deviceListState, dispatch } = useDeviceList();
  const {
    sortColumn,
    sortDirection,
    activePage,
    resultsPerPage,
    totalPages,
    addMgmtDomainModal,
    deleteModal,
    deviceStateModal,
    updateMgmtDomainModal,
    showConfigModal,
    changeHostnameModal,
    refetchTrigger,
  } = deviceListState;

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Sync filter + expanded ids from URL to reducer.
    const locationFilterData: Partial<Record<DeviceColumnKey, string>> = {};
    for (const [key, value] of searchParams.entries()) {
      const match = /^filter\[(.+)\]$/.exec(key);
      if (match && isDeviceColumnKey(match[1])) {
        locationFilterData[match[1]] = value;
      }
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
      // Mgmt domains are auxiliary expanded-row data; a failure here must
      // not hide the device table. Log and degrade silently — the mgmt-domain
      // widget already handles empty data gracefully.
      console.warn("Failed to load management domains:", err);
    }
  };

  const addDeviceJob = (deviceId: number, jobId: number) => {
    dispatch({ type: actions.ADD_DEVICE_JOB, deviceId, jobId });
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
      const prefix = sortDirection === "asc" ? "" : "-";
      urlParams.sort = `${prefix}${sortColumn}`;
    }

    for (const [key, value] of searchParams.entries()) {
      if (!value) continue;
      const match = /^filter\[(.+)\]$/.exec(key);
      if (!match) continue;
      const matchedKey = match[1];
      if (!isDeviceColumnKey(matchedKey)) continue;
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
      dispatch({ type: actions.SET_ERROR, error: null });
    } catch (err) {
      if (signal?.aborted) return;
      const message = await extractErrorMessageAsync(err);
      dispatch({ type: actions.SET_ERROR, error: new Error(message) });
      dispatch({ type: actions.SET_DEVICES, devices: [] });
    } finally {
      if (!signal?.aborted) {
        dispatch({ type: actions.SET_LOADING, loading: false });
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    getAllMgmtDomainsData(controller.signal);
    return () => controller.abort();
  }, [token]);

  // Update deviceData on changes
  useEffect(() => {
    const controller = new AbortController();
    getDevices(controller.signal);
    return () => controller.abort();
  }, [
    sortColumn,
    sortDirection,
    searchParams,
    activePage,
    resultsPerPage,
    refetchTrigger,
  ]);

  const handleFilterChange = (
    nextFilterData: FilterData,
    expandDeviceId: number | null = null,
  ) => {
    dispatch({ type: actions.SET_FILTER, filterData: nextFilterData });

    const filterParams: { [key: string]: string } = Object.fromEntries(
      Object.entries(nextFilterData)
        .filter(([, value]) => value)
        .map(([key, value]) => [`filter[${key}]`, value]),
    );
    if (expandDeviceId != null) {
      filterParams.expand = String(expandDeviceId);
    }

    const newSearchParams = new URLSearchParams(filterParams);
    const newSearch = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : "";

    if (newSearch && newSearch !== globalThis.location.search) {
      setSearchParams(newSearchParams);
    } else if (!newSearch && globalThis.location.search) {
      setSearchParams({});
    }
  };

  const handleAddMgmtDomains = (id: number) => {
    showToast({
      severity: "success",
      title: `Management domain ${id} added`,
      duration: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL, isOpen: false });
  };

  const handleDeleteMgmtDomain = (id: number) => {
    showToast({
      severity: "success",
      title: `Management domain ${id} deleted`,
      duration: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL, isOpen: false });
  };

  const handleUpdateMgmtDomains = (id: number) => {
    showToast({
      severity: "success",
      title: `Management domain ${id} updated`,
      duration: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL, isOpen: false });
  };

  return (
    <DeviceListPageActionsProvider value={{ handleFilterChange }}>
      <section>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 2,
            borderBottom: 1,
            borderColor: "divider",
            paddingBottom: 1.75,
          }}
        >
          <h2>Devices</h2>
          <div>
            <DeviceTableButtonGroup />
          </div>
        </Box>

        <TableContainer>
          <Table aria-label="Devices" size="small">
            <DeviceTableHeader />
            <DeviceTableBody />
          </Table>
        </TableContainer>

        <Pagination
          aria-label="Pagination Navigation"
          page={activePage}
          count={totalPages}
          onChange={(_event, page) =>
            dispatch({
              type: actions.SET_ACTIVE_PAGE,
              page: Number(page),
            })
          }
        />

        {/* MODALS */}
        <DeviceStateModal
          isOpen={deviceStateModal.isOpen}
          deviceId={deviceStateModal.deviceId}
          hostname={deviceStateModal.hostname}
          newState={deviceStateModal.newState}
          closeAction={() =>
            dispatch({ type: actions.TOGGLE_DEVICE_STATE_MODAL, isOpen: false })
          }
          onStateChange={getDevices}
        />

        <DeleteModal
          key={deleteModal.device?.id || "deletemodal"}
          device={deleteModal.device}
          isOpen={deleteModal.isOpen}
          addDeviceJob={addDeviceJob}
          closeAction={() =>
            dispatch({ type: actions.TOGGLE_DELETE_MODAL, isOpen: false })
          }
        />

        <AddMgmtDomainModal
          deviceA={addMgmtDomainModal.deviceA}
          deviceBCandidates={[...addMgmtDomainModal.deviceBCandidates]}
          isOpen={addMgmtDomainModal.isOpen}
          closeAction={() =>
            dispatch({
              type: actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL,
              isOpen: false,
            })
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
            dispatch({
              type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL,
              isOpen: false,
            })
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
            dispatch({
              type: actions.TOGGLE_CHANGE_HOSTNAME_MODAL,
              isOpen: false,
            })
          }
          onSuccess={async (_oldHostname: string, newHostname: string) => {
            const deviceId = changeHostnameModal.deviceId;
            if (deviceId == null) return;
            try {
              const device = await fetchDeviceById(deviceId, token);
              dispatch({ type: actions.UPDATE_DEVICE, deviceId, device });
              const interfaces = await fetchDeviceInterfaces(
                newHostname,
                token,
              );
              dispatch({
                type: actions.CACHE_INTERFACES,
                deviceId,
                interfaces,
              });
            } catch (err) {
              // UI keeps stale row; user can retry. Log for diagnostics.
              console.warn("Failed to refresh device after rename:", err);
            }
          }}
        />

        <ShowConfigModal
          key={showConfigModal.hostname ?? "closed"}
          hostname={showConfigModal.hostname}
          state={showConfigModal.state}
          isOpen={showConfigModal.isOpen}
          closeAction={() =>
            dispatch({ type: actions.TOGGLE_SHOW_CONFIG_MODAL, isOpen: false })
          }
        />
      </section>
    </DeviceListPageActionsProvider>
  );
}
