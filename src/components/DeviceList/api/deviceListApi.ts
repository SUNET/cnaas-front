import type { Device, DeviceState, DeviceType } from "../../../types/device";
import type { JobIdResponse } from "../../../types/job";
import type { MgmtDomain } from "../../../types/mgmtDomain";
import { getData, getResponse } from "../../../utils/getData";
import { deleteData, postData, putData } from "../../../utils/sendData";
import type { DeviceInterface } from "../types/deviceInterface";

const API = process.env.API_URL;

// --- Request/response payloads (API-shape only) ---

export interface DevicesPage {
  readonly devices: readonly Device[];
  readonly totalPages: number;
}

export interface MgmtDomainPayload {
  readonly device_a: string;
  readonly device_b: string;
  readonly ipv4_gw: string;
  readonly ipv6_gw: string;
  readonly vlan: number;
}

export interface MgmtDomainUpdatePayload extends MgmtDomainPayload {
  readonly id: number;
}

export interface DeviceInitPayload {
  readonly hostname: string;
  readonly device_type: DeviceType;
  readonly mlag_peer_hostname?: string;
  readonly mlag_peer_id?: number;
  readonly replace_hostname?: boolean;
}

export interface DeviceUpdatePayload {
  readonly state?: DeviceState;
  readonly hostname?: string;
  readonly synchronized?: boolean;
}

export interface DeviceDeletePayload {
  readonly factory_default?: boolean;
}

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
  const data = await getData(url, token, signal);
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
    totalCountHeader != null ? Number.parseInt(totalCountHeader, 10) : 0;
  const totalPages = Number.isNaN(totalCount)
    ? 1
    : Math.max(1, Math.ceil(totalCount / perPage));
  const data = await response.json();
  return { devices: data.data.devices, totalPages };
}

export async function fetchDeviceById(
  deviceId: number,
  token: string | null,
  signal?: AbortSignal,
): Promise<Device> {
  const url = `${API}/api/v1.0/device/${deviceId}`;
  const data = await getData(url, token, signal);
  return data.data.devices[0];
}

export async function fetchDeviceInterfaces(
  hostname: string,
  token: string | null,
): Promise<readonly DeviceInterface[]> {
  const url = `${API}/api/v1.0/device/${hostname}/interfaces`;
  const data = await getData(url, token);
  return Array.isArray(data?.data?.interfaces) ? data.data.interfaces : [];
}

export async function fetchLldpNeighbors(
  hostname: string,
  token: string | null,
): Promise<{ status: string }> {
  const url = `${API}/api/v1.0/device/${hostname}/lldp_neighbors`;
  return getData(url, token);
}

export async function updateDevice(
  deviceId: number,
  payload: DeviceUpdatePayload,
  token: string | null,
): Promise<{ status?: string; error?: string }> {
  const url = `${API}/api/v1.0/device/${deviceId}`;
  return putData(url, token, payload);
}

export async function deleteDevice(
  deviceId: number,
  payload: DeviceDeletePayload,
  token: string | null,
): Promise<JobIdResponse> {
  const url = `${API}/api/v1.0/device/${deviceId}`;
  return deleteData(url, token, payload);
}

export async function updateDeviceFacts(
  hostname: string,
  token: string | null,
): Promise<JobIdResponse> {
  const url = `${API}/api/v1.0/device_update_facts`;
  return postData(url, token, { hostname });
}

// --- Init / Init check ---

export async function initDevice(
  deviceId: number,
  payload: DeviceInitPayload,
  token: string | null,
): Promise<JobIdResponse> {
  const url = `${API}/api/v1.0/device_init/${deviceId}`;
  return postData(url, token, payload);
}

export async function initCheckDevice(
  deviceId: number,
  payload: DeviceInitPayload,
  token: string | null,
): Promise<{ data: unknown }> {
  const url = `${API}/api/v1.0/device_initcheck/${deviceId}`;
  return postData(url, token, payload);
}

// --- Mgmt domains ---

export async function fetchMgmtDomains(
  token: string | null,
  signal?: AbortSignal,
): Promise<readonly MgmtDomain[]> {
  const url = `${API}/api/v1.0/mgmtdomains`;
  const data = await getData(url, token, signal);
  return data.data.mgmtdomains;
}

export async function createMgmtDomain(
  payload: MgmtDomainPayload,
  token: string | null,
): Promise<{ data: { added_mgmtdomain: { id: number } } }> {
  const url = `${API}/api/v1.0/mgmtdomains`;
  return postData(url, token, payload);
}

export async function updateMgmtDomain(
  id: number,
  payload: MgmtDomainUpdatePayload,
  token: string | null,
): Promise<unknown> {
  const url = `${API}/api/v1.0/mgmtdomain/${id}`;
  return putData(url, token, payload);
}

export async function deleteMgmtDomain(
  id: number,
  token: string | null,
): Promise<unknown> {
  const url = `${API}/api/v1.0/mgmtdomain/${id}`;
  return deleteData(url, token);
}

// --- Configs (for ShowConfigModal) ---

export interface RunningConfigResponse {
  readonly data: { readonly config: string };
}

export interface GenerateConfigResponse {
  readonly data: {
    readonly config: {
      readonly generated_config: string;
      readonly available_variables?: unknown;
    };
  };
}

export interface PreviousConfigResponse {
  readonly data: {
    readonly config: string;
    readonly job_id: number;
  };
}

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
