import type { Device, DeviceState } from "../../../types/device";
import type { MgmtDomain } from "../../../types/mgmtDomain";
import type { DeviceColumnKey } from "../types/table";
import type { DeviceInterface } from "../types/deviceInterface";
import type {
  AddMgmtDomainModal,
  ChangeHostnameModal,
  DeleteModal,
  DeviceStateModal,
  ShowConfigModal,
  UpdateMgmtDomainModal,
} from "../types/modals";
import type { FilterData, SortDirection } from "../types/table";

// --- Types ---

export type DeviceJobs = {
  readonly [deviceId: string]: readonly number[];
};

export type InterfaceCache = {
  readonly [deviceId: number]: readonly DeviceInterface[];
};

export type NetboxModelCache = {
  readonly [model: string]: unknown;
};

export type NetboxDeviceCache = {
  readonly [deviceId: number]: unknown;
};

export type DeviceListState = {
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
  readonly expandedIds: ReadonlySet<number>;
  readonly addMgmtDomainModal: AddMgmtDomainModal;
  readonly deleteModal: DeleteModal;
  readonly deviceStateModal: DeviceStateModal;
  readonly updateMgmtDomainModal: UpdateMgmtDomainModal;
  readonly showConfigModal: ShowConfigModal;
  readonly changeHostnameModal: ChangeHostnameModal;
};

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
  CACHE_NETBOX_MODEL: "CACHE_NETBOX_MODEL",
  CACHE_NETBOX_DEVICE: "CACHE_NETBOX_DEVICE",
  CLEAR_FILTER_AND_SORT: "CLEAR_FILTER_AND_SORT",
  ADD_DEVICE_JOB: "ADD_DEVICE_JOB",
  CHAIN_DEVICE_NEXT_JOB: "CHAIN_DEVICE_NEXT_JOB",
  APPEND_LOG: "APPEND_LOG",
  EXPAND_DEVICES: "EXPAND_DEVICES",
  COLLAPSE_DEVICE: "COLLAPSE_DEVICE",
  TOGGLE_DEVICE_EXPANDED: "TOGGLE_DEVICE_EXPANDED",
  TOGGLE_ADD_MGMT_DOMAIN_MODAL: "TOGGLE_ADD_MGMT_DOMAIN_MODAL",
  TOGGLE_DELETE_MODAL: "TOGGLE_DELETE_MODAL",
  TOGGLE_DEVICE_STATE_MODAL: "TOGGLE_DEVICE_STATE_MODAL",
  TOGGLE_UPDATE_MGMT_DOMAIN_MODAL: "TOGGLE_UPDATE_MGMT_DOMAIN_MODAL",
  TOGGLE_SHOW_CONFIG_MODAL: "TOGGLE_SHOW_CONFIG_MODAL",
  TOGGLE_CHANGE_HOSTNAME_MODAL: "TOGGLE_CHANGE_HOSTNAME_MODAL",
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
      deviceId: number;
      interfaces: readonly DeviceInterface[];
    }
  | {
      type: typeof actions.CACHE_NETBOX_MODEL;
      model: string;
      data: unknown;
    }
  | {
      type: typeof actions.CACHE_NETBOX_DEVICE;
      deviceId: number;
      data: unknown;
    }
  | { type: typeof actions.CLEAR_FILTER_AND_SORT }
  | { type: typeof actions.ADD_DEVICE_JOB; deviceId: number; jobId: number }
  | {
      type: typeof actions.CHAIN_DEVICE_NEXT_JOB;
      jobId: number;
      nextJobId: number;
    }
  | { type: typeof actions.APPEND_LOG; line: string }
  | {
      type: typeof actions.EXPAND_DEVICES;
      deviceIds: readonly number[];
    }
  | { type: typeof actions.COLLAPSE_DEVICE; deviceId: number }
  | { type: typeof actions.TOGGLE_DEVICE_EXPANDED; deviceId: number }
  | {
      type: typeof actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL;
      isOpen: boolean;
      deviceA?: string;
      deviceBCandidates?: readonly Device[];
    }
  | {
      type: typeof actions.TOGGLE_DELETE_MODAL;
      isOpen: boolean;
      device?: Device | null;
    }
  | {
      type: typeof actions.TOGGLE_DEVICE_STATE_MODAL;
      isOpen: boolean;
      hostname?: string;
      deviceId?: number;
      newState?: DeviceState;
    }
  | {
      type: typeof actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL;
      isOpen: boolean;
      mgmtId?: number;
      deviceA?: string;
      deviceB?: string;
      ipv4Initial?: string | null;
      ipv6Initial?: string | null;
      vlanInitial?: number;
    }
  | {
      type: typeof actions.TOGGLE_SHOW_CONFIG_MODAL;
      isOpen: boolean;
      hostname?: string;
      state?: DeviceState;
    }
  | {
      type: typeof actions.TOGGLE_CHANGE_HOSTNAME_MODAL;
      isOpen: boolean;
      deviceId?: number;
      hostname?: string;
    };

// --- Initial state ---

export type InitialSettings = {
  readonly filterData: FilterData;
  readonly filterActive: boolean;
  readonly sortColumn: string | null;
  readonly sortDirection: SortDirection;
  readonly activePage: number;
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly resultsPerPage: number;
};

/**
 * Persistence shape for state slices owned by this reducer.
 * Mirrors the JSON written to localStorage("deviceList"). Optional fields
 * because older payloads may be missing keys.
 */
export type StoredSettings = {
  readonly sortColumn?: string | null;
  readonly sortDirection?: SortDirection;
  readonly activePage?: number;
  readonly activeColumns?: readonly DeviceColumnKey[];
  readonly resultsPerPage?: number;
};

// Closed-state constants — also returned by close actions.
const CLOSED_ADD_MGMT_DOMAIN: AddMgmtDomainModal = {
  isOpen: false,
  deviceA: null,
  deviceBCandidates: [],
};

const CLOSED_DELETE: DeleteModal = {
  isOpen: false,
  device: null,
};

const CLOSED_DEVICE_STATE: DeviceStateModal = {
  isOpen: false,
  hostname: null,
  deviceId: null,
  newState: null,
};

const CLOSED_UPDATE_MGMT_DOMAIN: UpdateMgmtDomainModal = {
  isOpen: false,
  mgmtId: null,
  deviceA: null,
  deviceB: null,
  ipv4Initial: null,
  ipv6Initial: null,
  vlanInitial: null,
};

const CLOSED_SHOW_CONFIG: ShowConfigModal = {
  isOpen: false,
  hostname: null,
  state: null,
};

const CLOSED_CHANGE_HOSTNAME: ChangeHostnameModal = {
  isOpen: false,
  deviceId: null,
  hostname: null,
};

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
    expandedIds: new Set(),
    addMgmtDomainModal: CLOSED_ADD_MGMT_DOMAIN,
    deleteModal: CLOSED_DELETE,
    deviceStateModal: CLOSED_DEVICE_STATE,
    updateMgmtDomainModal: CLOSED_UPDATE_MGMT_DOMAIN,
    showConfigModal: CLOSED_SHOW_CONFIG,
    changeHostnameModal: CLOSED_CHANGE_HOSTNAME,
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
          [action.deviceId]: action.interfaces,
        },
      };

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
          [action.deviceId]: action.data,
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

    case actions.EXPAND_DEVICES: {
      if (action.deviceIds.length === 0) return state;
      const next = new Set(state.expandedIds);
      let added = false;
      for (const id of action.deviceIds) {
        if (!next.has(id)) {
          next.add(id);
          added = true;
        }
      }
      return added ? { ...state, expandedIds: next } : state;
    }

    case actions.COLLAPSE_DEVICE: {
      if (!state.expandedIds.has(action.deviceId)) return state;
      const next = new Set(state.expandedIds);
      next.delete(action.deviceId);
      return { ...state, expandedIds: next };
    }

    case actions.TOGGLE_DEVICE_EXPANDED: {
      const next = new Set(state.expandedIds);
      if (next.has(action.deviceId)) next.delete(action.deviceId);
      else next.add(action.deviceId);
      return { ...state, expandedIds: next };
    }

    case actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL:
      return {
        ...state,
        addMgmtDomainModal: action.isOpen
          ? {
              isOpen: true,
              deviceA: action.deviceA ?? null,
              deviceBCandidates: action.deviceBCandidates ?? [],
            }
          : CLOSED_ADD_MGMT_DOMAIN,
      };

    case actions.TOGGLE_DELETE_MODAL:
      return {
        ...state,
        deleteModal: action.isOpen
          ? {
              isOpen: true,
              device: action.device ? { ...action.device } : null,
            }
          : CLOSED_DELETE,
      };

    case actions.TOGGLE_DEVICE_STATE_MODAL:
      return {
        ...state,
        deviceStateModal: action.isOpen
          ? {
              isOpen: true,
              hostname: action.hostname ?? null,
              deviceId: action.deviceId ?? null,
              newState: action.newState ?? null,
            }
          : CLOSED_DEVICE_STATE,
      };

    case actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL:
      return {
        ...state,
        updateMgmtDomainModal: action.isOpen
          ? {
              isOpen: true,
              mgmtId: action.mgmtId ?? null,
              deviceA: action.deviceA ?? null,
              deviceB: action.deviceB ?? null,
              ipv4Initial: action.ipv4Initial ?? null,
              ipv6Initial: action.ipv6Initial ?? null,
              vlanInitial: action.vlanInitial ?? null,
            }
          : CLOSED_UPDATE_MGMT_DOMAIN,
      };

    case actions.TOGGLE_SHOW_CONFIG_MODAL:
      return {
        ...state,
        showConfigModal: action.isOpen
          ? {
              isOpen: true,
              hostname: action.hostname ?? null,
              state: action.state ?? null,
            }
          : CLOSED_SHOW_CONFIG,
      };

    case actions.TOGGLE_CHANGE_HOSTNAME_MODAL:
      return {
        ...state,
        changeHostnameModal: action.isOpen
          ? {
              isOpen: true,
              deviceId: action.deviceId ?? null,
              hostname: action.hostname ?? null,
            }
          : CLOSED_CHANGE_HOSTNAME,
      };

    default:
      return state;
  }
}
