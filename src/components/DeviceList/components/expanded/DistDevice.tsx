import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface DistDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for DIST devices in MANAGED / UNMANAGED state.
 *
 * DIST owns: management-domain widget (always), port-config (when
 * `distPortConfig` localStorage flag is set). DIST is the leaf layer of
 * the VXLAN/EVPN fabric — VTEPs live here, ESI pairs the two DIST
 * switches that an ACCESS device uplinks to.
 */
export function DistDevice({ fallback }: DistDeviceProps): ReactNode {
  return fallback;
}
