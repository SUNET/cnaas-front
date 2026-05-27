import { getData } from "../../../utils/getData";
import { putData, postData } from "../../../utils/sendData";
import { extractErrorMessage } from "../../../utils/extractErrorMessage";

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
