import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface PreConfiguredDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for `PRE_CONFIGURED` devices.
 *
 * Best current understanding: a device that has a configuration which
 * NMS may overwrite in the future (e.g. operator staged a device before
 * the hardware physically arrived). May be merged with the broader
 * "no actions allowed" fallback later, after consulting domain experts.
 */
export function PreConfiguredDevice({
  fallback,
}: PreConfiguredDeviceProps): ReactNode {
  return fallback;
}
