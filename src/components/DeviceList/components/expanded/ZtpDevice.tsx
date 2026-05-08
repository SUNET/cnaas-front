import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface ZtpDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for devices in the Zero Touch Provisioning lifecycle.
 *
 * ZTP states: DHCP_BOOT → DISCOVERED → INIT → (becomes MANAGED with
 * concrete device_type, exits ZTP). Each state has a distinct panel:
 *
 *   - DHCP_BOOT: switch booted, got DHCP lease, awaiting discovery.
 *     Action menu: Delete + Change hostname.
 *   - DISCOVERED: backend discovered the switch (LLDP, facts), awaiting
 *     operator to fill hostname + type via init form. Panel hosts
 *     <DeviceInitForm>. Action menu: Delete only.
 *   - INIT: operator initiated, init job(s) running. Panel shows
 *     "Init jobs: …". No actions.
 */
export function ZtpDevice({ fallback }: ZtpDeviceProps): ReactNode {
  return fallback;
}
