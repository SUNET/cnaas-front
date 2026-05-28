// Table UI surface types shared between the table components, the socket
// hook, and the reducer state.
//
// `types/` is a leaf: nothing here imports from sibling feature directories
// (api/, stores/, hooks/, components/). This prevents import cycles.

export const COLUMN_MAP = {
  id: "ID",
  hostname: "Hostname",
  device_type: "Device type",
  state: "State",
  synchronized: "Synchronized",
  model: "Model",
  os_version: "OS version",
  management_ip: "Management IP",
  dhcp_ip: "DHCP IP",
  serial: "Serial",
  vendor: "Vendor",
  platform: "Platform",
} as const;

export type DeviceColumnKey = keyof typeof COLUMN_MAP;

export function isDeviceColumnKey(key: string): key is DeviceColumnKey {
  return Object.hasOwn(COLUMN_MAP, key);
}

export type SortDirection = "ascending" | "descending" | null;

/**
 * Active filter values keyed by column. All keys optional — a column without
 * a filter is simply absent from the record.
 */
export type FilterData = Partial<Record<DeviceColumnKey, string>>;
