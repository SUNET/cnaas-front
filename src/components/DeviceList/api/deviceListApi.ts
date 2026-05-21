import type { Device, DeviceState, DeviceType } from "../../../types/device";
import type { ScheduledJobResponse } from "../../../types/job";
import type { Linknet } from "../../../types/linknet";
import type { MgmtDomain } from "../../../types/mgmtDomain";
import { getData, getResponse } from "../../../utils/getData";
import { deleteData, postData, putData } from "../../../utils/sendData";
import type { DeviceInterface } from "../types/deviceInterface";

const API = process.env.API_URL;

// --- Response envelope ---
//
// Every success response from the backend is wrapped as
//   { status: "success", data: T }
// Error responses are { status: "error", message: string } and surface as
// thrown errors via checkResponseStatus in the transport layer, so callers
// only see the success branch.

type ApiSuccess<T> = {
  readonly status: "success";
  readonly data: T;
};

// --- Request payloads (API-shape only) ---

export type MgmtDomainPayload = {
  readonly device_a: string;
  readonly device_b: string;
  readonly ipv4_gw: string;
  readonly ipv6_gw: string;
  readonly vlan: number;
};

export type DeviceInitPayload = {
  readonly hostname: string;
  readonly device_type: DeviceType;
  readonly mlag_peer_hostname?: string;
  readonly mlag_peer_id?: number;
  readonly replace_hostname?: boolean;
};

export type DeviceUpdatePayload = {
  readonly state?: DeviceState;
  readonly hostname?: string;
  readonly synchronized?: boolean;
};

export type DeviceDeletePayload = {
  readonly factory_default?: boolean;
};

// --- View-layer types for callers ---

export type DevicesPage = {
  readonly devices: readonly Device[];
  readonly totalPages: number;
};

// --- Devices ---

export async function fetchDiscoveredDevices(
  token: string | null,
  perPage?: number,
  signal?: AbortSignal,
): Promise<readonly Device[]> {
  const state: DeviceState = "DISCOVERED";
  const query =
    perPage == null
      ? `filter[state]=${state}`
      : `filter[state]=${state}&per_page=${perPage}`;
  const url = `${API}/api/v1.0/devices?${query}`;
  const data: ApiSuccess<{ readonly devices: readonly Device[] }> =
    await getData(url, token, signal);
  return data.data.devices;
}

export async function fetchDevicesPage(
  query: string,
  perPage: number,
  token: string | null,
  signal?: AbortSignal,
): Promise<DevicesPage> {
  const url = `${API}/api/v1.0/devices?${query}`;
  const response = await getResponse(url, token ?? undefined, signal);
  const totalCountHeader = response.headers.get("X-Total-Count");
  const totalCount =
    totalCountHeader !== null ? Number.parseInt(totalCountHeader, 10) : 0;
  const totalPages = Number.isNaN(totalCount)
    ? 1
    : Math.max(1, Math.ceil(totalCount / perPage));
  const body: ApiSuccess<{ readonly devices: readonly Device[] }> =
    await response.json();
  return { devices: body.data.devices, totalPages };
}

export async function fetchDeviceById(
  deviceId: number,
  token: string | null,
  signal?: AbortSignal,
): Promise<Device> {
  const url = `${API}/api/v1.0/device/${deviceId}`;
  const data: ApiSuccess<{ readonly devices: readonly Device[] }> =
    await getData(url, token, signal);
  const device = data.data.devices[0];
  if (device === undefined) {
    throw new Error(`Device ${deviceId} not found`);
  }
  return device;
}

export async function fetchDeviceInterfaces(
  hostname: string,
  token: string | null,
): Promise<readonly DeviceInterface[]> {
  const url = `${API}/api/v1.0/device/${hostname}/interfaces`;
  const data: ApiSuccess<{
    readonly interfaces: readonly DeviceInterface[];
    readonly hostname: string;
  }> = await getData(url, token);
  return Array.isArray(data?.data?.interfaces) ? data.data.interfaces : [];
}

export type LldpNeighbor = {
  readonly hostname: string;
  readonly port: string;
};

export type LldpNeighborsResponse = ApiSuccess<{
  // Keyed by local interface name; an interface can have multiple neighbors
  // visible (shared media), so each value is an array.
  readonly lldp_neighbors: Record<string, readonly LldpNeighbor[]>;
}>;

export async function fetchLldpNeighbors(
  hostname: string,
  token: string | null,
): Promise<LldpNeighborsResponse> {
  const url = `${API}/api/v1.0/device/${hostname}/lldp_neighbors`;
  return getData(url, token);
}

export type UpdateDeviceResponse = ApiSuccess<{
  readonly updated_device: Device;
}>;

export async function updateDevice(
  deviceId: number,
  payload: DeviceUpdatePayload,
  token: string | null,
): Promise<UpdateDeviceResponse> {
  const url = `${API}/api/v1.0/device/${deviceId}`;
  return putData(url, token, payload);
}

export type DeleteDeviceResponse =
  | ScheduledJobResponse
  | ApiSuccess<{ readonly deleted_device: Device }>;

export async function deleteDevice(
  deviceId: number,
  payload: DeviceDeletePayload,
  token: string | null,
): Promise<DeleteDeviceResponse> {
  const url = `${API}/api/v1.0/device/${deviceId}`;
  return deleteData(url, token, payload);
}

export async function updateDeviceFacts(
  hostname: string,
  token: string | null,
): Promise<ScheduledJobResponse> {
  const url = `${API}/api/v1.0/device_update_facts`;
  return postData(url, token, { hostname });
}

// --- Init / Init check ---

export async function initDevice(
  deviceId: number,
  payload: DeviceInitPayload,
  token: string | null,
): Promise<ScheduledJobResponse> {
  const url = `${API}/api/v1.0/device_init/${deviceId}`;
  return postData(url, token, payload);
}

// Backend assembles this incrementally inside DeviceInitCheckApi.post; keys
// are genuinely conditional (e.g. `neighbors` only set when `linknets` is
// non-empty), so optional `?` matches the wire shape.
export type InitCheckResult = {
  readonly compatible: boolean;
  readonly linknets: readonly Linknet[];
  readonly linknets_compatible: boolean;
  readonly linknets_error?: string;
  readonly neighbors?: readonly string[];
  readonly neighbors_compatible: boolean;
  readonly neighbors_error?: string;
  readonly mlag_compatible?: boolean;
  readonly parsed_args: Record<string, unknown>;
};

export type InitCheckResponse = ApiSuccess<InitCheckResult>;

export async function initCheckDevice(
  deviceId: number,
  payload: DeviceInitPayload,
  token: string | null,
): Promise<InitCheckResponse> {
  const url = `${API}/api/v1.0/device_initcheck/${deviceId}`;
  return postData(url, token, payload);
}

// --- Mgmt domains ---

export async function fetchMgmtDomains(
  token: string | null,
  signal?: AbortSignal,
): Promise<readonly MgmtDomain[]> {
  const url = `${API}/api/v1.0/mgmtdomains`;
  const data: ApiSuccess<{ readonly mgmtdomains: readonly MgmtDomain[] }> =
    await getData(url, token, signal);
  return data.data.mgmtdomains;
}

export type CreateMgmtDomainResponse = ApiSuccess<{
  readonly added_mgmtdomain: MgmtDomain;
}>;

export async function createMgmtDomain(
  payload: MgmtDomainPayload,
  token: string | null,
): Promise<CreateMgmtDomainResponse> {
  const url = `${API}/api/v1.0/mgmtdomains`;
  return postData(url, token, payload);
}

// Backend returns updated_mgmtdomain when fields changed, unchanged_mgmtdomain
// when the PUT was a no-op. Both carry the full MgmtDomain.
export type UpdateMgmtDomainResponse = ApiSuccess<
  | { readonly updated_mgmtdomain: MgmtDomain }
  | { readonly unchanged_mgmtdomain: MgmtDomain }
>;

export async function updateMgmtDomain(
  id: number,
  payload: MgmtDomainPayload,
  token: string | null,
): Promise<UpdateMgmtDomainResponse> {
  const url = `${API}/api/v1.0/mgmtdomain/${id}`;
  return putData(url, token, payload);
}

export type DeleteMgmtDomainResponse = ApiSuccess<{
  readonly deleted_mgmtdomain: MgmtDomain;
}>;

export async function deleteMgmtDomain(
  id: number,
  token: string | null,
): Promise<DeleteMgmtDomainResponse> {
  const url = `${API}/api/v1.0/mgmtdomain/${id}`;
  return deleteData(url, token);
}

// --- Configs ---

export type RunningConfigResponse = ApiSuccess<{
  readonly config: string;
}>;

export type GenerateConfigResponse = ApiSuccess<{
  readonly config: {
    readonly hostname: string;
    readonly generated_config: string;
    readonly available_variables: Record<string, unknown>;
  };
}>;

export type PreviousConfigResponse = ApiSuccess<{
  readonly config: string;
  readonly job_id: number;
  readonly finish_time: string; // ISO 8601, e.g. "2026-04-27T14:36:13"
  readonly failed: boolean;
}>;

export async function fetchRunningConfig(
  hostname: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<RunningConfigResponse> {
  const url = `${API}/api/v1.0/device/${hostname}/running_config`;
  return getData(url, token, signal);
}

export async function fetchGenerateConfig(
  hostname: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<GenerateConfigResponse> {
  const url = `${API}/api/v1.0/device/${hostname}/generate_config`;
  return getData(url, token, signal);
}

export async function fetchPreviousConfig(
  hostname: string,
  previous: number,
  token: string | null,
  signal?: AbortSignal,
): Promise<PreviousConfigResponse> {
  const url = `${API}/api/v1.0/device/${hostname}/previous_config?previous=${previous}`;
  return getData(url, token, signal);
}
