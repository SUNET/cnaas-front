import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import {
  Grid,
  GridColumn,
  GridRow,
  Pagination,
  Table,
} from "semantic-ui-react";

import { useAuthToken } from "../../../contexts/AuthTokenContext";
import {
  DeviceListPageActionsProvider,
  useDeviceList,
} from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import {
  COLUMN_MAP,
  isDeviceColumnKey,
  type DeviceColumnKey,
  type FilterData,
  type SortDirection,
} from "../types/table";
import {
  fetchDeviceById,
  fetchDeviceInterfaces,
  fetchDevicesPage,
  fetchMgmtDomains,
} from "../api/deviceListApi";

import { UpdateMgmtDomainModal } from "./actionModals/UpdateMgmtDomainModal";
import { DeviceTableBody } from "./DeviceTableBody";
import { DeviceTableButtonGroup } from "./DeviceTableButtonGroup";
import { DeviceTableHeader } from "./DeviceTableHeader";
import { AddMgmtDomainModal } from "./actionModals/AddMgmtDomainModal";
import { DeleteModal } from "./actionModals/DeleteModal";
import { HostnameModal } from "./actionModals/HostnameModal";
import { ShowConfigModal } from "./actionModals/ShowConfigModal";
import { DeviceStateModal } from "./actionModals/DeviceStateModal";

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
      const prefix = sortDirection === "ascending" ? "" : "-";
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
      setError(null);
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
    dispatch({ type: actions.SET_ACTIVE_PAGE, page: 1 });
    dispatch({ type: actions.SET_FILTER, filterData: nextFilterData });
    dispatch({
      type: actions.SET_FILTER_ACTIVE,
      active: Object.values(nextFilterData).some((v) => v),
    });

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
    toast({
      type: "success",
      title: `Management domain ${id} added`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL, isOpen: false });
  };

  const handleDeleteMgmtDomain = (id: number) => {
    toast({
      type: "success",
      title: `Management domain ${id} deleted`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL, isOpen: false });
  };

  const handleUpdateMgmtDomains = (id: number) => {
    toast({
      type: "success",
      title: `Management domain ${id} updated`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    dispatch({ type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL, isOpen: false });
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
    <DeviceListPageActionsProvider value={{ handleFilterChange }}>
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
                clearSort={() =>
                  dispatch({
                    type: actions.SET_SORT,
                    column: null,
                    direction: null,
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
          closeAction={() =>
            dispatch({ type: actions.TOGGLE_SHOW_CONFIG_MODAL, isOpen: false })
          }
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
    </DeviceListPageActionsProvider>
  );
}
