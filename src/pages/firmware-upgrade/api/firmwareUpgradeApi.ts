import { getData } from "../../../utils/getData";
import { postData } from "../../../utils/sendData";
import type { Device } from "../../../types/device";

const API = process.env.API_URL;

/** What the upgrade targets: either a single device or a whole group. */
export type CommitTarget = {
  readonly hostname?: string[];
  readonly group?: string;
};

/** Per-device status map extracted from an EXCEPTION job's `result`. */
export type FailedDevices = Readonly<
  Record<string, { readonly failed?: boolean }>
>;

/**
 * Pull the per-device status map out of a job's `result` (typed `unknown`).
 * Returns an empty map when the result has no `devices` field.
 */
export function getExceptionDevices(result: unknown): FailedDevices {
  if (result && typeof result === "object" && "devices" in result) {
    const { devices } = result;
    if (devices && typeof devices === "object") {
      return devices as FailedDevices;
    }
  }
  return {};
}

/** Per-device OS/arch info from GET /devices?filter[hostname][in]=. */
export type DeviceOsVersionData = readonly Pick<
  Device,
  "hostname" | "os_version" | "cpu_arch" | "platform"
>[];

export async function fetchDevicesInGroup(
  group: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<string[]> {
  const { data } = await getData(
    `${API}/api/v1.0/groups/${encodeURIComponent(group)}`,
    token,
    signal,
  );
  return data.groups[group] ?? [];
}

/** Current OS/arch info for the given devices (GET /devices?filter[hostname][in]=). */
export async function fetchDeviceUpgradeFacts(
  hostname: string[],
  token: string | null,
  signal?: AbortSignal,
): Promise<DeviceOsVersionData> {
  const { data } = await getData(
    `${API}/api/v1.0/devices?filter[hostname][in]=${encodeURIComponent(hostname.join(","))}`,
    token,
    signal,
  );
  return data.devices ?? [];
}

/** Firmware image filenames downloaded to this NMS instance (GET /firmware). */
export async function fetchFirmwareFiles(
  token: string | null,
  signal?: AbortSignal,
): Promise<string[]> {
  const { data } = await getData(`${API}/api/v1.0/firmware`, token, signal);
  return data.files ?? [];
}

/**
 * Staggered-reboot plan for an ACCESS-only group: an ordered list of reboot
 * steps, each a list of hostnames (POST /firmware/upgradecheck). Rejects with
 * the raw `Response` on a non-2xx status (e.g. 400 for incompatible groups).
 */
export async function fetchStaggeredSteps(
  group: string,
  token: string | null,
): Promise<string[][]> {
  const { data } = await postData(
    `${API}/api/v1.0/firmware/upgradecheck`,
    token,
    { group },
  );
  return data.upgrade_groups;
}
