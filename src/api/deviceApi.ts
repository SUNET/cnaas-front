import { getData } from "../utils/getData";
import type { Device } from "../types/device";

/**
 * Cross-page shared device helpers. Page-specific device fetchers live
 * under src/pages/<page>/api/.
 */

/**
 * Per-interface operational status as reported by the backend. All known
 * fields are optional — the backend omits keys it cannot determine. The
 * index signature keeps the shape assignable to `Record<string, unknown>`
 * for consumers that store it loosely (e.g. the InterfaceConfig reducer).
 */
export type InterfaceStatus = {
  readonly is_up?: boolean;
  readonly description?: string;
  readonly speed?: number;
  readonly [key: string]: unknown;
};

/** Map of interface name -> status, keyed within a single device. */
export type DeviceInterfaceStatus = Record<string, InterfaceStatus>;

/**
 * Fetch a single device by hostname.
 * Returns the device object, or null on failure.
 *
 * Cross-page shared helper (used by the InterfaceConfig page and the
 * shared useDevice hook).
 */
export async function fetchDevice(
  hostname: string,
  token: string | null,
): Promise<Device | null> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}`;
    const response = (await getData(url, token)) as {
      data: { devices: (Device | undefined)[] };
    };
    const device = response.data.devices[0];
    return device ?? null;
  } catch (error) {
    console.error(`Failed to fetch device ${hostname}:`, error);
    return null;
  }
}

/**
 * Fetch operational interface status for a device.
 * Returns a map of interface name -> status, or an empty map on failure.
 *
 * Cross-page shared helper (used by the InterfaceConfig and Dashboard pages).
 */
export async function fetchInterfaceStatus(
  hostname: string,
  token: string | null,
): Promise<DeviceInterfaceStatus> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
    const data = (await getData(url, token)) as {
      data: { interface_status: DeviceInterfaceStatus };
    };
    return data.data.interface_status;
  } catch (error) {
    console.log(error);
    return {};
  }
}
