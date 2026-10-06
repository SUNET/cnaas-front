/**
 * Pure reducer for InterfaceConfig state.
 *
 * All state for the /interface-config page lives here.
 * Async side-effects (fetches, socket events) are handled
 * by the provider — they dispatch actions into this reducer.
 */

// --- Shared types ---

import {
  isAccessInterfaceItem,
  isDistInterfaceItem,
  type AccessInterfaceItem,
  type DistInterfaceItem,
} from "../types/interfaces";
import type { LldpNeighbor } from "../types/lldp";
import type { Vlan } from "../types/vlan";
import type { PortTemplate } from "../types/portTemplate";
import type { Device } from "../../../types/device";
import type { LinknetMismatch } from "../types/linknet";

export type JobEntry = {
  job_id: number;
  status: string;
  next_job_id?: number;
};

// --- State ---

export type InterfaceConfigState = {
  device: Device | null;

  settings: Record<string, unknown> | null;
  interfaces: (AccessInterfaceItem | DistInterfaceItem)[];
  interfaceStatus: Record<string, Record<string, unknown>>;
  lldpNeighbors: Record<string, LldpNeighbor[]>;
  mlagPeerHostname: string | null;

  vlans: Vlan[];
  vlanRanges: ReadonlySet<string>;
  tags: string[];
  portTemplates: PortTemplate[];

  netboxDevice: Record<string, unknown> | null;
  netboxInterfaces: Record<string, unknown>[];
  netboxModel: Record<string, unknown> | null;

  interfaceDataUpdated: Record<string, Record<string, unknown>>;
  interfaceToggleUntagged: Record<string, boolean>;

  synchronized: boolean | null;
  thirdPartyUpdate: boolean;
  updatedBy: string | null;
  ownUpdateInProgress: boolean;

  autoPushJobs: JobEntry[];
  isWorking: boolean;

  displayColumns: string[];
  interfaceBounceRunning: Record<string, string>;
  linknetMismatches: Record<string, LinknetMismatch>;
  linknetCheckedPorts: string[];
};

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
  ADD_VLAN_RANGE_OPTION: "ADD_VLAN_RANGE_OPTION",
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

  LINKNET_MISMATCHES_LOADED: "LINKNET_MISMATCHES_LOADED",

  RELOAD_ALL: "RELOAD_ALL",
} as const;

export type ActionType = (typeof actions)[keyof typeof actions];

export type Action =
  | { type: typeof actions.DEVICE_LOADED; device: Device | null }
  | {
      type: typeof actions.SETTINGS_LOADED;
      settings: Record<string, unknown>;
      vlans: Vlan[];
      tags: string[];
    }
  | {
      type: typeof actions.INTERFACES_LOADED;
      interfaces: (AccessInterfaceItem | DistInterfaceItem)[];
      tags: string[];
      mlagPeerHostname?: string | null;
      portTemplates?: PortTemplate[];
      vlanRanges?: ReadonlySet<string>;
    }
  | {
      type: typeof actions.INTERFACE_STATUS_LOADED;
      interfaceStatus: Record<string, Record<string, unknown>>;
    }
  | {
      type: typeof actions.LLDP_LOADED;
      lldpNeighbors: Record<string, LldpNeighbor[]>;
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
    }
  | {
      type: typeof actions.TOGGLE_UNTAGGED;
      interfaceName: string;
      untagged: boolean;
    }
  | { type: typeof actions.ADD_TAG_OPTION; tag: string }
  | { type: typeof actions.ADD_VLAN_RANGE_OPTION; range: string }
  | { type: typeof actions.ADD_PORT_TEMPLATE_OPTION; template: string }
  | { type: typeof actions.ADD_NEW_INTERFACE; interfaceName: string }
  | { type: typeof actions.SET_DISPLAY_COLUMNS; columns: string[] }
  | { type: typeof actions.DEVICE_UPDATED; synchronized: boolean }
  | { type: typeof actions.MARK_THIRD_PARTY_UPDATE; updatedBy?: string }
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
  | {
      type: typeof actions.LINKNET_MISMATCHES_LOADED;
      mismatches: Record<string, LinknetMismatch>;
      checkedPorts: string[];
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
  vlanRanges: new Set(),
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
  updatedBy: null,
  ownUpdateInProgress: false,

  // Job tracking
  autoPushJobs: [],
  isWorking: false,

  // UI
  displayColumns: [],
  interfaceBounceRunning: {},
  linknetMismatches: {},
  linknetCheckedPorts: [],
};

// --- Original (loaded/backend) field values ---
//
// UPDATE_FIELD needs to know whether an edited value actually differs from
// what was loaded, so it can drop the field from `interfaceDataUpdated`
// (clearing the row's dirty/edited styling) when a user reverts an edit.
// The reducer is the
// single source of truth for what counts as "unchanged".
//
// `description`'s synthesized placeholder (e.g. "Uplink to X") is a
// rendering-only concern of InterfaceTableRow and is intentionally not
// reproduced here — we compare against the raw backend description.
//
// VLAN fields (untagged_vlan/tagged_vlan_list) are compared as raw VLAN
// ids.

// Fallback value per field when the backend didn't send that key at all.
const ACCESS_FIELD_DEFAULTS: Record<string, unknown> = {
  aggregate_id: null,
  bpdu_filter: false,
  description: "",
  enabled: true,
  redundant_link: true,
  tagged_vlan_list: null,
  tags: [],
  untagged_vlan: null,
};

const DIST_FIELD_DEFAULTS: Record<string, unknown> = {
  description: "",
  enabled: true,
  ifclass: null,
  port_template: null,
  redundant_link: true,
  tagged_vlan_list: [],
  tags: [],
  untagged_vlan: null,
};

function getOriginalFieldValue(
  interfaces: (AccessInterfaceItem | DistInterfaceItem)[],
  interfaceName: string,
  field: string,
): unknown {
  const item = interfaces.find((i) => i.name === interfaceName);
  if (!item) return undefined;

  if (field === "config") return item.config ?? ACCESS_FIELD_DEFAULTS.config;

  if (isAccessInterfaceItem(item)) {
    const data = item.data;
    switch (field) {
      case "configtype":
        return item.configtype ?? null;
      case "description":
        return data?.description ?? ACCESS_FIELD_DEFAULTS.description;
      case "untagged_vlan":
        return data?.untagged_vlan ?? ACCESS_FIELD_DEFAULTS.untagged_vlan;
      case "tagged_vlan_list":
        return data?.tagged_vlan_list ?? ACCESS_FIELD_DEFAULTS.tagged_vlan_list;
      case "tags":
        return data?.tags ?? ACCESS_FIELD_DEFAULTS.tags;
      case "enabled":
        return data?.enabled ?? ACCESS_FIELD_DEFAULTS.enabled;
      case "aggregate_id":
        return data?.aggregate_id ?? ACCESS_FIELD_DEFAULTS.aggregate_id;
      case "bpdu_filter":
        return data?.bpdu_filter ?? ACCESS_FIELD_DEFAULTS.bpdu_filter;
      case "redundant_link":
        return data?.redundant_link ?? ACCESS_FIELD_DEFAULTS.redundant_link;
      default:
        return undefined;
    }
  }

  if (isDistInterfaceItem(item)) {
    switch (field) {
      case "ifclass":
        return item.ifclass?.startsWith("port_template")
          ? "port_template"
          : (item.ifclass ?? DIST_FIELD_DEFAULTS.ifclass);
      case "port_template":
        return item.ifclass?.startsWith("port_template")
          ? item.ifclass.substring("port_template_".length)
          : DIST_FIELD_DEFAULTS.port_template;
      case "description":
        return item.peer_hostname ?? DIST_FIELD_DEFAULTS.description;
      case "tagged_vlan_list":
        return item.tagged_vlan_list ?? DIST_FIELD_DEFAULTS.tagged_vlan_list;
      case "tags":
        return item.tags ?? DIST_FIELD_DEFAULTS.tags;
      case "redundant_link":
        return item.redundant_link ?? DIST_FIELD_DEFAULTS.redundant_link;
      case "untagged_vlan":
        return DIST_FIELD_DEFAULTS.untagged_vlan;
      case "enabled":
        return DIST_FIELD_DEFAULTS.enabled;
      default:
        return undefined;
    }
  }

  return undefined;
}

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
        linknetMismatches: {},
        linknetCheckedPorts: [],
      };

    case actions.SETTINGS_LOADED:
      return {
        ...state,
        settings: action.settings,
        vlans: action.vlans,
        tags: mergeTags(state.tags, action.tags),
      };

    case actions.INTERFACES_LOADED: {
      let vlanRanges = state.vlanRanges;
      if (action.vlanRanges && action.vlanRanges.size > 0) {
        const merged = new Set(vlanRanges);
        for (const r of action.vlanRanges) merged.add(r);
        vlanRanges = merged;
      }
      return {
        ...state,
        interfaces: action.interfaces,
        tags: mergeTags(state.tags, action.tags),
        portTemplates: action.portTemplates ?? state.portTemplates,
        mlagPeerHostname: action.mlagPeerHostname ?? state.mlagPeerHostname,
        vlanRanges,
      };
    }

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
      const { interfaceName, field, value } = action;
      const defaultValue = getOriginalFieldValue(
        state.interfaces,
        interfaceName,
        field,
      );
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
        tags: state.tags.includes(action.tag)
          ? state.tags
          : [...state.tags, action.tag],
      };

    case actions.ADD_VLAN_RANGE_OPTION:
      if (state.vlanRanges.has(action.range)) {
        return state;
      }
      return {
        ...state,
        vlanRanges: new Set(state.vlanRanges).add(action.range),
      };

    case actions.ADD_PORT_TEMPLATE_OPTION:
      return {
        ...state,
        portTemplates: state.portTemplates.some(
          (pt) => pt.name === action.template,
        )
          ? state.portTemplates
          : [...state.portTemplates, { name: action.template }],
      };

    case actions.ADD_NEW_INTERFACE:
      return {
        ...state,
        interfaces: [
          ...state.interfaces,
          {
            name: action.interfaceName,
            indexnum: 0,
            ifclass: "custom",
            tags: null,
          },
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
      return {
        ...state,
        thirdPartyUpdate: true,
        updatedBy: action.updatedBy ?? null,
      };

    case actions.CLEAR_THIRD_PARTY_UPDATE:
      return { ...state, thirdPartyUpdate: false, updatedBy: null };

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

    // --- Linknet verification ---

    case actions.LINKNET_MISMATCHES_LOADED:
      return {
        ...state,
        linknetMismatches: action.mismatches,
        linknetCheckedPorts: action.checkedPorts,
      };

    // --- Reload ---

    case actions.RELOAD_ALL:
      return {
        ...state,
        thirdPartyUpdate: false,
        updatedBy: null,
        ownUpdateInProgress: false,
        interfaceDataUpdated: {},
      };

    default:
      throw new Error(`Unknown action: ${(action as { type: string }).type}`);
  }
}

// --- Helpers ---

function mergeTags(
  existing: string[],
  incoming: string[] | undefined,
): string[] {
  if (!incoming?.length) return existing;
  const merged = existing.slice();
  incoming.forEach((tag) => {
    if (!merged.includes(tag)) merged.push(tag);
  });
  return merged;
}

function isJobStopped(status: string): boolean {
  return status === "FINISHED" || status === "EXCEPTION";
}
