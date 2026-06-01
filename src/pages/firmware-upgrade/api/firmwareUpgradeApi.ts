import { getData } from "../../../utils/getData";
import { postData } from "../../../utils/sendData";
import type { Device } from "../../../types/device";

const API = process.env.API_URL;

/** What the upgrade targets: either a single device or a whole group. */
export type CommitTarget = {
  readonly hostname?: string;
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

/** Body of the `data` envelope from GET /devices?filter[hostname]=. */
export type DeviceOsVersionData = {
  readonly devices: readonly Device[];
};

/**
 * Body of the `data` envelope from GET /groups/{group}/os_version.
 * `groups[groupName][osVersion]` lists the hostnames currently running that
 * OS version.
 */
export type GroupOsVersionData = {
  readonly groups: Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
  >;
};

/** Current OS version(s) for a single device, keyed by hostname. */
export async function fetchDeviceOsVersion(
  hostname: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<DeviceOsVersionData> {
  const { data } = await getData(
    `${API}/api/v1.0/devices?filter[hostname]=${encodeURIComponent(hostname)}`,
    token,
    signal,
  );
  return data;
}

/** Current OS versions for every device in a group. */
export async function fetchGroupOsVersion(
  group: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<GroupOsVersionData> {
  const { data } = await getData(
    `${API}/api/v1.0/groups/${encodeURIComponent(group)}/os_version`,
    token,
    signal,
  );
  return data;
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
