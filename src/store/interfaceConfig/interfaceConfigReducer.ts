/**
 * Pure reducer for InterfaceConfig state.
 *
 * All state for the /interface-config page lives here.
 * Async side-effects (fetches, socket events) are handled
 * by the provider — they dispatch actions into this reducer.
 */

// --- Shared types ---

export interface DropdownOption {
  text: string;
  value: string | null;
  description?: number | string;
  vlan_config?: string;
  key?: string;
}

export interface InterfaceItem {
  name: string;
  configtype?: string;
  ifclass?: string;
  data?: Record<string, unknown>;
  config?: string;
  peer_hostname?: string;
  model?: string;
  tags?: string[] | null;
  [key: string]: unknown;
}

export interface Device {
  id: number;
  hostname: string;
  device_type: "ACCESS" | "DIST";
  synchronized: boolean;
  confhash?: string;
  model?: string;
  [key: string]: unknown;
}

export interface JobEntry {
  job_id: number;
  status: string;
  next_job_id?: number;
}

// --- State ---

export interface InterfaceConfigState {
  device: Device | null;

  settings: Record<string, unknown> | null;
  interfaces: InterfaceItem[];
  interfaceStatus: Record<string, Record<string, unknown>>;
  lldpNeighbors: Record<string, unknown>;
  mlagPeerHostname: string | null;

  vlans: DropdownOption[];
  untaggedVlans: DropdownOption[];
  tags: DropdownOption[];
  portTemplates: DropdownOption[];

  netboxDevice: Record<string, unknown> | null;
  netboxInterfaces: Record<string, unknown>[];
  netboxModel: Record<string, unknown> | null;

  interfaceDataUpdated: Record<string, Record<string, unknown>>;
  interfaceToggleUntagged: Record<string, boolean>;

  synchronized: boolean | null;
  thirdPartyUpdate: boolean;
  ownUpdateInProgress: boolean;

  autoPushJobs: JobEntry[];
  isWorking: boolean;

  displayColumns: string[];
  interfaceBounceRunning: Record<string, string>;
}

// --- Action types ---

export const actions = {
  DEVICE_LOADED: "DEVICE_LOADED",
  SETTINGS_LOADED: "SETTINGS_LOADED",
  INTERFACES_LOADED: "INTERFACES_LOADED",
  INTERFACE_STATUS_LOADED: "INTERFACE_STATUS_LOADED",
  LLDP_LOADED: "LLDP_LOADED",
  NETBOX_LOADED: "NETBOX_LOADED",

  UPDATE_FIELD: "UPDATE_FIELD",
  TOGGLE_UNTAGGED: "TOGGLE_UNTAGGED",
  ADD_TAG_OPTION: "ADD_TAG_OPTION",
  ADD_PORT_TEMPLATE_OPTION: "ADD_PORT_TEMPLATE_OPTION",
  ADD_NEW_INTERFACE: "ADD_NEW_INTERFACE",
  SET_DISPLAY_COLUMNS: "SET_DISPLAY_COLUMNS",

  DEVICE_UPDATED: "DEVICE_UPDATED",
  MARK_THIRD_PARTY_UPDATE: "MARK_THIRD_PARTY_UPDATE",
  CLEAR_THIRD_PARTY_UPDATE: "CLEAR_THIRD_PARTY_UPDATE",

  JOB_STARTED: "JOB_STARTED",
  JOB_UPDATED: "JOB_UPDATED",

  SAVE_STARTED: "SAVE_STARTED",
  SAVE_FAILED: "SAVE_FAILED",
  SAVE_COMPLETED: "SAVE_COMPLETED",

  BOUNCE_STARTED: "BOUNCE_STARTED",
  BOUNCE_FINISHED: "BOUNCE_FINISHED",

  RELOAD_ALL: "RELOAD_ALL",
} as const;

export type ActionType = (typeof actions)[keyof typeof actions];

export type Action =
  | { type: typeof actions.DEVICE_LOADED; device: Device | null }
  | {
      type: typeof actions.SETTINGS_LOADED;
      settings: Record<string, unknown>;
      vlans: DropdownOption[];
      untaggedVlans: DropdownOption[];
      tags: DropdownOption[];
    }
  | {
      type: typeof actions.INTERFACES_LOADED;
      interfaces: InterfaceItem[];
      tags: DropdownOption[];
      mlagPeerHostname?: string;
      portTemplates?: DropdownOption[];
    }
  | {
      type: typeof actions.INTERFACE_STATUS_LOADED;
      interfaceStatus: Record<string, Record<string, unknown>>;
    }
  | {
      type: typeof actions.LLDP_LOADED;
      lldpNeighbors: Record<string, unknown>;
    }
  | {
      type: typeof actions.NETBOX_LOADED;
      netboxDevice?: Record<string, unknown> | null;
      netboxInterfaces?: Record<string, unknown>[];
      netboxModel?: Record<string, unknown> | null;
    }
  | {
      type: typeof actions.UPDATE_FIELD;
      interfaceName: string;
      field: string;
      value: unknown;
      defaultValue: unknown;
    }
  | {
      type: typeof actions.TOGGLE_UNTAGGED;
      interfaceName: string;
      untagged: boolean;
    }
  | { type: typeof actions.ADD_TAG_OPTION; tag: string }
  | { type: typeof actions.ADD_PORT_TEMPLATE_OPTION; template: string }
  | { type: typeof actions.ADD_NEW_INTERFACE; interfaceName: string }
  | { type: typeof actions.SET_DISPLAY_COLUMNS; columns: string[] }
  | { type: typeof actions.DEVICE_UPDATED; synchronized: boolean }
  | { type: typeof actions.MARK_THIRD_PARTY_UPDATE }
  | { type: typeof actions.CLEAR_THIRD_PARTY_UPDATE }
  | { type: typeof actions.JOB_STARTED; jobId: number }
  | { type: typeof actions.JOB_UPDATED; jobData: JobEntry }
  | { type: typeof actions.SAVE_STARTED }
  | { type: typeof actions.SAVE_FAILED }
  | { type: typeof actions.SAVE_COMPLETED }
  | { type: typeof actions.BOUNCE_STARTED; interfaceName: string }
  | {
      type: typeof actions.BOUNCE_FINISHED;
      interfaceName: string;
      result: string;
    }
  | { type: typeof actions.RELOAD_ALL };

// --- Initial state ---

export const initialState: InterfaceConfigState = {
  // Device
  device: null,

  // Interface config data
  settings: null,
  interfaces: [],
  interfaceStatus: {},
  lldpNeighbors: {},
  mlagPeerHostname: null,

  // Field options (dropdowns)
  vlans: [],
  untaggedVlans: [],
  tags: [],
  portTemplates: [],

  // Netbox
  netboxDevice: null,
  netboxInterfaces: [],
  netboxModel: null,

  // Edit state
  interfaceDataUpdated: {},
  interfaceToggleUntagged: {},

  // Sync / socket
  synchronized: null,
  thirdPartyUpdate: false,
  ownUpdateInProgress: false,

  // Job tracking
  autoPushJobs: [],
  isWorking: false,

  // UI
  displayColumns: [],
  interfaceBounceRunning: {},
};

// --- Reducer ---

export function interfaceConfigReducer(
  state: InterfaceConfigState,
  action: Action,
): InterfaceConfigState {
  switch (action.type) {
    // --- Data loading ---

    case actions.DEVICE_LOADED:
      return {
        ...state,
        device: action.device,
        synchronized: action.device?.synchronized ?? null,
      };

    case actions.SETTINGS_LOADED:
      return {
        ...state,
        settings: action.settings,
        vlans: action.vlans,
        untaggedVlans: action.untaggedVlans,
        tags: mergeTags(state.tags, action.tags),
      };

    case actions.INTERFACES_LOADED:
      return {
        ...state,
        interfaces: action.interfaces,
        tags: mergeTags(state.tags, action.tags),
        portTemplates: action.portTemplates ?? state.portTemplates,
        mlagPeerHostname: action.mlagPeerHostname ?? state.mlagPeerHostname,
      };

    case actions.INTERFACE_STATUS_LOADED:
      return { ...state, interfaceStatus: action.interfaceStatus };

    case actions.LLDP_LOADED:
      return { ...state, lldpNeighbors: action.lldpNeighbors };

    case actions.NETBOX_LOADED:
      return {
        ...state,
        netboxDevice: action.netboxDevice ?? state.netboxDevice,
        netboxInterfaces: action.netboxInterfaces ?? state.netboxInterfaces,
        netboxModel: action.netboxModel ?? state.netboxModel,
      };

    // --- Edit actions ---

    case actions.UPDATE_FIELD: {
      const { interfaceName, field, value, defaultValue } = action;
      const updated = { ...state.interfaceDataUpdated };

      if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
        updated[interfaceName] = { ...updated[interfaceName], [field]: value };
      } else if (updated[interfaceName]?.[field] !== undefined) {
        const rest = { ...updated[interfaceName] };
        delete rest[field];
        if (Object.keys(rest).length === 0) {
          delete updated[interfaceName];
        } else {
          updated[interfaceName] = rest;
        }
      }

      if (field === "ifclass" && value !== "port_template") {
        if (updated[interfaceName]) {
          delete updated[interfaceName].port_template;
        }
      }

      return { ...state, interfaceDataUpdated: updated };
    }

    case actions.TOGGLE_UNTAGGED: {
      const { interfaceName, untagged } = action;
      const toggles = { ...state.interfaceToggleUntagged };
      if (untagged) {
        toggles[interfaceName] = true;
      } else {
        delete toggles[interfaceName];
      }
      return { ...state, interfaceToggleUntagged: toggles };
    }

    case actions.ADD_TAG_OPTION:
      return {
        ...state,
        tags: [...state.tags, { text: action.tag, value: action.tag }],
      };

    case actions.ADD_PORT_TEMPLATE_OPTION:
      return {
        ...state,
        portTemplates: [
          ...state.portTemplates,
          { text: action.template, value: action.template },
        ],
      };

    case actions.ADD_NEW_INTERFACE:
      return {
        ...state,
        interfaces: [
          ...state.interfaces,
          { name: action.interfaceName, ifclass: "custom", tags: null },
        ],
      };

    case actions.SET_DISPLAY_COLUMNS:
      return { ...state, displayColumns: action.columns };

    // --- Socket / sync ---

    case actions.DEVICE_UPDATED:
      return {
        ...state,
        synchronized: action.synchronized,
      };

    case actions.MARK_THIRD_PARTY_UPDATE:
      return { ...state, thirdPartyUpdate: true };

    case actions.CLEAR_THIRD_PARTY_UPDATE:
      return { ...state, thirdPartyUpdate: false };

    // --- Job tracking ---

    case actions.JOB_STARTED:
      return {
        ...state,
        isWorking: true,
        ownUpdateInProgress: true,
        autoPushJobs: [{ job_id: action.jobId, status: "RUNNING" }],
      };

    case actions.JOB_UPDATED: {
      const { jobData } = action;
      const jobs = state.autoPushJobs;

      // First job got a next_job_id — add second job
      if (
        jobs.length === 1 &&
        jobs[0].job_id === jobData.job_id &&
        typeof jobData.next_job_id === "number"
      ) {
        return {
          ...state,
          autoPushJobs: [
            jobData,
            { job_id: jobData.next_job_id, status: "RUNNING" },
          ],
        };
      }

      // First job stopped without producing a next job
      if (
        jobs.length === 1 &&
        jobs[0].job_id === jobData.job_id &&
        isJobStopped(jobData.status)
      ) {
        return {
          ...state,
          autoPushJobs: [jobData],
          isWorking: false,
        };
      }

      // Second job updated
      if (jobs.length === 2 && jobs[1].job_id === jobData.job_id) {
        const newJobs = [jobs[0], jobData];
        const finished = isJobStopped(jobData.status);
        return {
          ...state,
          autoPushJobs: newJobs,
          isWorking: finished ? false : state.isWorking,
          interfaceDataUpdated: finished ? {} : state.interfaceDataUpdated,
        };
      }

      return state;
    }

    // --- Save lifecycle ---

    case actions.SAVE_STARTED:
      return { ...state, isWorking: true };

    case actions.SAVE_FAILED:
      return { ...state, isWorking: false };

    case actions.SAVE_COMPLETED:
      return { ...state, interfaceDataUpdated: {} };

    // --- Bounce ---

    case actions.BOUNCE_STARTED:
      return {
        ...state,
        interfaceBounceRunning: {
          ...state.interfaceBounceRunning,
          [action.interfaceName]: "running",
        },
      };

    case actions.BOUNCE_FINISHED:
      return {
        ...state,
        interfaceBounceRunning: {
          ...state.interfaceBounceRunning,
          [action.interfaceName]: action.result,
        },
      };

    // --- Reload ---

    case actions.RELOAD_ALL:
      return {
        ...state,
        thirdPartyUpdate: false,
        ownUpdateInProgress: false,
        interfaceDataUpdated: {},
      };

    default:
      throw new Error(`Unknown action: ${(action as { type: string }).type}`);
  }
}

// --- Helpers ---

function mergeTags(
  existing: DropdownOption[],
  incoming: DropdownOption[] | undefined,
): DropdownOption[] {
  if (!incoming?.length) return existing;
  const merged = existing.slice();
  incoming.forEach((tag) => {
    if (!merged.some((e) => e.text === tag.text)) {
      merged.push(tag);
    }
  });
  return merged;
}

function isJobStopped(status: string): boolean {
  return status === "FINISHED" || status === "EXCEPTION";
}
