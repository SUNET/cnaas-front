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
