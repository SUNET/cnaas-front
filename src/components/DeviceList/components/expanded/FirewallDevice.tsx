import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface FirewallDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for FIREWALL devices in MANAGED / UNMANAGED state.
 *
 * Sparse panel — FIREWALL sits at the network edge with the standard
 * MANAGED action menu but no fabric-specific widgets.
 */
export function FirewallDevice({ fallback }: FirewallDeviceProps): ReactNode {
  return fallback;
}
