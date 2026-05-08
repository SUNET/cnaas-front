import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface CoreDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for CORE devices in MANAGED / UNMANAGED state.
 *
 * CORE is the spine layer in the VXLAN/EVPN fabric. By design CORE has
 * no peer connections, no external connections, no VTEP — it just
 * full-meshes to all DIST switches. The expanded panel is correspondingly
 * sparse: only shows the management-domain widget when the deployment
 * has `MGMT_DOMAIN_CORE_ENABLED` set.
 */
export function CoreDevice({ fallback }: CoreDeviceProps): ReactNode {
  return fallback;
}
