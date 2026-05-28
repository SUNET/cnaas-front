import { getData } from "../utils/getData";

/**
 * Fetch a single device by hostname.
 * Returns the device object, or null on failure.
 *
 * Cross-page shared helper (used by InterfaceConfig page and the
 * shared useDevice hook). Page-specific device fetchers live under
 * src/components/<Page>/api/.
 */
export async function fetchDevice(hostname, token) {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}`;
    const device = (await getData(url, token)).data.devices[0];
    return device ?? null;
  } catch (error) {
    console.error(`Failed to fetch device ${hostname}:`, error);
    return null;
  }
}
