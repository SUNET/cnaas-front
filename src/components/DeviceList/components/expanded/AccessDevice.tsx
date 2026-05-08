import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface AccessDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for ACCESS devices in MANAGED / UNMANAGED state.
 *
 * ACCESS owns: Replace flow, Configure-ports action, MLAG/uplink interface
 * links. ACCESS lives below the VXLAN fabric and is dual-homed via LACP to
 * a DIST pair.
 */
export function AccessDevice({ fallback }: AccessDeviceProps): ReactNode {
  return fallback;
}
