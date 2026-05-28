import { getData } from "../../../utils/getData";
import { putData, postData } from "../../../utils/sendData";
import { extractErrorMessage } from "../../../utils/extractErrorMessage";

// --- Interface item response types ---
//
// These mirror the wire shape returned by:
//   AccessInterfaceItem  -> GET /api/v1.0/device/<hostname>/interfaces
//   DistInterfaceItem    -> GET /api/v1.0/device/<hostname>/generate_config
//                           (.data.config.available_variables.interfaces[])
//
// ACCESS `data` has a closed shape validated by the backend
// (cnaas-nms/src/cnaas_nms/api/interface.py PUT handler).
// DIST `data` is kept opaque (only emitted for ifclass="downlink",
// currently only carries `description`).

export type AccessInterfaceData = {
  vxlan?: string;
  untagged_vlan?: number | string;
  tagged_vlan_list?: (number | string)[];
  neighbor?: string;
  neighbor_id?: number;
  description?: string;
  enabled?: boolean;
  aggregate_id?: number;
  bpdu_filter?: boolean;
  redundant_link?: boolean;
  tags?: string[];
  cli_append_str?: string;
};

export type AccessInterfaceItem = {
  name: string;
  indexnum: number;
  configtype: string;
  config?: string | null;
  data: AccessInterfaceData | null;
};

export type DistInterfaceItem = {
  name: string;
  indexnum: number;
  ifclass: string;
  config?: string | null;
  tags?: string[] | null;
  tagged_vlan_list?: (number | string)[] | null;
  redundant_link?: boolean; // only on ifclass === "downlink"
  peer_hostname?: string; // only on ifclass === "fabric"
  data?: Record<string, unknown>; // only on ifclass === "downlink"
};

// --- Response shapes ---

type ApiResult = {
  readonly status?: string;
  readonly message?: string;
  readonly data?: unknown;
};

function isApiResult(x: unknown): x is ApiResult {
  return typeof x === "object" && x !== null;
}

export type SaveInterfacesResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type StartAutoPushResult = { readonly jobId: number };

export type BounceInterfaceResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

// --- Interface CRUD ---

export async function saveInterfaces(
  hostname: string,
  body: unknown,
  token: string | null,
): Promise<SaveInterfacesResult> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
    const data: unknown = await putData(url, token, body);
    if (!isApiResult(data)) {
      return { success: false, error: "Unexpected response shape" };
    }
    if (data.status === "success") return { success: true };
    return { success: false, error: data.message ?? "Unknown error" };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error) };
  }
}

/** Import interfaces from a JSON file. Same endpoint as saveInterfaces but separate caller. */
export const importInterfaces = saveInterfaces;

export async function fetchRunningConfig(
  hostname: string,
  interfaceName: string,
  token: string | null,
): Promise<string | null> {
  const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/running_config?interface=${interfaceName}`;
  const resp: unknown = await getData(url, token);
  if (
    isApiResult(resp) &&
    typeof resp.data === "object" &&
    resp.data !== null &&
    "config" in resp.data &&
    typeof (resp.data as { config: unknown }).config === "string"
  ) {
    return (resp.data as { config: string }).config;
  }
  return null;
}

// --- Sync / push ---

export async function startAutoPush(
  hostname: string | null,
  token: string | null,
): Promise<StartAutoPushResult> {
  // TODO: device_syncto is also called from ConfigChange/api/configChangeApi.ts; consider promoting to src/api/ if a third caller appears.
  const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
  const body = {
    dry_run: true,
    comment: "interface update via WebUI",
    hostname,
    auto_push: true,
  };
  const data: unknown = await postData(url, token, body);
  if (
    isApiResult(data) &&
    typeof (data as { job_id?: unknown }).job_id === "number"
  ) {
    return { jobId: (data as { job_id: number }).job_id };
  }
  throw new Error("Missing job_id in autopush response");
}

// --- Interface actions ---

export async function bounceInterface(
  hostname: string | null,
  interfaceName: string,
  token: string | null,
): Promise<BounceInterfaceResult> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
    const body = { bounce_interfaces: [interfaceName] };
    const data: unknown = await putData(url, token, body);
    if (isApiResult(data) && data.status === "success") {
      return { success: true };
    }
    const errorBody = isApiResult(data) ? String(data.data) : "Unknown error";
    return { success: false, error: errorBody };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error) };
  }
}

// --- Export (blob download) ---

export async function exportInterfaces(
  hostname: string,
  token: string | null,
): Promise<Blob> {
  const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces_export`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.blob();
}
