import type { Device, DeviceState } from "../../../types/device";
import type { MgmtDomain } from "../../../types/mgmtDomain";
import type { DeviceColumnKey } from "../types/columns";
import type { DeviceInterface } from "../types/deviceInterface";
import type { FilterData, SortDirection } from "../types/table";

// --- Types ---

export interface DeviceJobs {
  readonly [deviceId: string]: readonly number[];
}

export interface InterfaceCache {
  readonly [hostname: string]: readonly DeviceInterface[];
}

export interface NetboxModelCache {
  readonly [model: string]: unknown;
}

export interface NetboxDeviceCache {
  readonly [hostname: string]: unknown;
}

export interface DeviceListState {
  readonly deviceData: readonly Device[];
  readonly filterData: FilterData;
  readonly filterActive: boolean;
  readonly sortColumn: string | null;
  readonly sortDirection: SortDirection;
  readonly activePage: number;
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly resultsPerPage: number;
  readonly totalPages: number;
  readonly mgmtDomainsData: readonly MgmtDomain[];
  readonly deviceInterfaceData: InterfaceCache;
  readonly netboxModelData: NetboxModelCache;
  readonly netboxDeviceData: NetboxDeviceCache;
  readonly deviceJobs: DeviceJobs;
  readonly logLines: readonly string[];
}

// --- Action types ---

export const actions = {
  SET_DEVICES: "SET_DEVICES",
  UPDATE_DEVICE: "UPDATE_DEVICE",
  MARK_DEVICE_DELETED: "MARK_DEVICE_DELETED",
  PATCH_DEVICE_STATE: "PATCH_DEVICE_STATE",
  SET_FILTER: "SET_FILTER",
  SET_FILTER_ACTIVE: "SET_FILTER_ACTIVE",
  SET_SORT: "SET_SORT",
  SET_ACTIVE_PAGE: "SET_ACTIVE_PAGE",
  SET_ACTIVE_COLUMNS: "SET_ACTIVE_COLUMNS",
  SET_RESULTS_PER_PAGE: "SET_RESULTS_PER_PAGE",
  SET_TOTAL_PAGES: "SET_TOTAL_PAGES",
  SET_MGMT_DOMAINS: "SET_MGMT_DOMAINS",
  CACHE_INTERFACES: "CACHE_INTERFACES",
  REMOVE_INTERFACES: "REMOVE_INTERFACES",
  CACHE_NETBOX_MODEL: "CACHE_NETBOX_MODEL",
  CACHE_NETBOX_DEVICE: "CACHE_NETBOX_DEVICE",
  CLEAR_FILTER_AND_SORT: "CLEAR_FILTER_AND_SORT",
  ADD_DEVICE_JOB: "ADD_DEVICE_JOB",
  CHAIN_DEVICE_NEXT_JOB: "CHAIN_DEVICE_NEXT_JOB",
  APPEND_LOG: "APPEND_LOG",
} as const;

export type Action =
  | { type: typeof actions.SET_DEVICES; devices: readonly Device[] }
  | { type: typeof actions.UPDATE_DEVICE; deviceId: number; device: Device }
  | { type: typeof actions.MARK_DEVICE_DELETED; deviceId: number }
  | {
      type: typeof actions.PATCH_DEVICE_STATE;
      deviceId: number;
      state: DeviceState;
    }
  | { type: typeof actions.SET_FILTER; filterData: FilterData }
  | { type: typeof actions.SET_FILTER_ACTIVE; active: boolean }
  | {
      type: typeof actions.SET_SORT;
      column: string | null;
      direction: SortDirection;
    }
  | { type: typeof actions.SET_ACTIVE_PAGE; page: number }
  | {
      type: typeof actions.SET_ACTIVE_COLUMNS;
      columns: readonly DeviceColumnKey[];
    }
  | { type: typeof actions.SET_RESULTS_PER_PAGE; perPage: number }
  | { type: typeof actions.SET_TOTAL_PAGES; pages: number }
  | {
      type: typeof actions.SET_MGMT_DOMAINS;
      mgmtDomains: readonly MgmtDomain[];
    }
  | {
      type: typeof actions.CACHE_INTERFACES;
      hostname: string;
      interfaces: readonly DeviceInterface[];
    }
  | { type: typeof actions.REMOVE_INTERFACES; hostname: string }
  | {
      type: typeof actions.CACHE_NETBOX_MODEL;
      model: string;
      data: unknown;
    }
  | {
      type: typeof actions.CACHE_NETBOX_DEVICE;
      hostname: string;
      data: unknown;
    }
  | { type: typeof actions.CLEAR_FILTER_AND_SORT }
  | { type: typeof actions.ADD_DEVICE_JOB; deviceId: number; jobId: number }
  | {
      type: typeof actions.CHAIN_DEVICE_NEXT_JOB;
      jobId: number;
      nextJobId: number;
    }
  | { type: typeof actions.APPEND_LOG; line: string };

// --- Initial state ---

export interface InitialSettings {
  readonly filterData: FilterData;
  readonly filterActive: boolean;
  readonly sortColumn: string | null;
  readonly sortDirection: SortDirection;
  readonly activePage: number;
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly resultsPerPage: number;
}

/**
 * Persistence shape for state slices owned by this reducer.
 * Mirrors the JSON written to localStorage("deviceList"). Optional fields
 * because older payloads may be missing keys.
 */
export interface StoredSettings {
  readonly sortColumn?: string | null;
  readonly sortDirection?: SortDirection;
  readonly activePage?: number;
  readonly activeColumns?: readonly DeviceColumnKey[];
  readonly resultsPerPage?: number;
}

export function buildInitialState(settings: InitialSettings): DeviceListState {
  return {
    deviceData: [],
    filterData: settings.filterData,
    filterActive: settings.filterActive,
    sortColumn: settings.sortColumn,
    sortDirection: settings.sortDirection,
    activePage: settings.activePage,
    activeColumns: settings.activeColumns,
    resultsPerPage: settings.resultsPerPage,
    totalPages: 1,
    mgmtDomainsData: [],
    deviceInterfaceData: {},
    netboxModelData: {},
    netboxDeviceData: {},
    deviceJobs: {},
    logLines: [],
  };
}

// --- Reducer ---

const MAX_LOG_LINES = 1000;

export function deviceListReducer(
  state: DeviceListState,
  action: Action,
): DeviceListState {
  switch (action.type) {
    case actions.SET_DEVICES:
      return { ...state, deviceData: action.devices };

    case actions.UPDATE_DEVICE:
      return {
        ...state,
        deviceData: state.deviceData.map((dev) =>
          dev.id === action.deviceId ? action.device : dev,
        ),
      };

    case actions.MARK_DEVICE_DELETED:
      return {
        ...state,
        deviceData: state.deviceData.map((dev) =>
          dev.id === action.deviceId ? { ...dev, deleted: true } : dev,
        ),
      };

    case actions.PATCH_DEVICE_STATE:
      return {
        ...state,
        deviceData: state.deviceData.map((dev) =>
          dev.id === action.deviceId ? { ...dev, state: action.state } : dev,
        ),
      };

    case actions.SET_FILTER:
      return { ...state, filterData: action.filterData };

    case actions.SET_FILTER_ACTIVE:
      return { ...state, filterActive: action.active };

    case actions.SET_SORT:
      return {
        ...state,
        sortColumn: action.column,
        sortDirection: action.direction,
      };

    case actions.SET_ACTIVE_PAGE:
      return { ...state, activePage: action.page };

    case actions.SET_ACTIVE_COLUMNS:
      return { ...state, activeColumns: action.columns };

    case actions.SET_RESULTS_PER_PAGE:
      return { ...state, resultsPerPage: action.perPage };

    case actions.SET_TOTAL_PAGES:
      return { ...state, totalPages: action.pages };

    case actions.SET_MGMT_DOMAINS:
      return { ...state, mgmtDomainsData: action.mgmtDomains };

    case actions.CACHE_INTERFACES:
      return {
        ...state,
        deviceInterfaceData: {
          ...state.deviceInterfaceData,
          [action.hostname]: action.interfaces,
        },
      };

    case actions.REMOVE_INTERFACES: {
      if (!(action.hostname in state.deviceInterfaceData)) return state;
      const rest = { ...state.deviceInterfaceData };
      delete rest[action.hostname];
      return { ...state, deviceInterfaceData: rest };
    }

    case actions.CACHE_NETBOX_MODEL:
      return {
        ...state,
        netboxModelData: {
          ...state.netboxModelData,
          [action.model]: action.data,
        },
      };

    case actions.CACHE_NETBOX_DEVICE:
      return {
        ...state,
        netboxDeviceData: {
          ...state.netboxDeviceData,
          [action.hostname]: action.data,
        },
      };

    case actions.CLEAR_FILTER_AND_SORT:
      return {
        ...state,
        filterData: {},
        filterActive: false,
        sortColumn: null,
        sortDirection: null,
        activePage: 1,
      };

    case actions.ADD_DEVICE_JOB: {
      const existing = state.deviceJobs[action.deviceId] ?? [];
      return {
        ...state,
        deviceJobs: {
          ...state.deviceJobs,
          [action.deviceId]: [...existing, action.jobId],
        },
      };
    }

    case actions.CHAIN_DEVICE_NEXT_JOB: {
      const updated: { [deviceId: string]: readonly number[] } = {};
      for (const [deviceId, jobs] of Object.entries(state.deviceJobs)) {
        updated[deviceId] =
          jobs[0] === action.jobId ? [action.jobId, action.nextJobId] : jobs;
      }
      return { ...state, deviceJobs: updated };
    }

    case actions.APPEND_LOG: {
      const logLines = [...state.logLines, action.line];
      if (logLines.length > MAX_LOG_LINES) {
        logLines.shift();
      }
      return { ...state, logLines };
    }

    default:
      return state;
  }
}
