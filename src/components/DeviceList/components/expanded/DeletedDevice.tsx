import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface DeletedDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Expanded panel for soft-deleted devices (`device.deleted === true`).
 *
 * No actions allowed in this state — the device is in a recoverable
 * trash state and NMS cannot operate on it until restored.
 */
export function DeletedDevice({ fallback }: DeletedDeviceProps): ReactNode {
  return fallback;
}
