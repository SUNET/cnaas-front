// Test-only helpers for building Device fixtures. Backend response shape:
// every nullable column comes back as explicit null, never omitted.
import type { Device } from "../../types/device";

export function makeDevice(
  id: number,
  overrides: Partial<Device> = {},
): Device {
  return {
    id,
    hostname: `host-${id}`,
    device_type: "ACCESS",
    state: "MANAGED",
    site_id: null,
    description: null,
    management_ip: null,
    secondary_management_ip: null,
    dhcp_ip: null,
    infra_ip: null,
    oob_ip: null,
    serial: null,
    ztp_mac: null,
    platform: null,
    vendor: null,
    model: null,
    os_version: null,
    synchronized: true,
    confhash: null,
    last_seen: null,
    port: null,
    ...overrides,
  };
}
