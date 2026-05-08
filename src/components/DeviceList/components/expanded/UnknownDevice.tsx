import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";

interface UnknownDeviceProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Defensive fallback panel for devices in an unrecognised configuration.
 *
 * Reached from two distinct dispatch branches:
 *   - `state === "UNKNOWN"` — defensive against backend reporting a
 *     state literal we do not recognise.
 *   - `device_type === "UNKNOWN"` while in an active state — should
 *     never occur in practice (typing happens during ZTP) but the
 *     compiler requires the branch for exhaustiveness.
 *
 * In both cases the panel renders the same "no actions allowed" content.
 */
export function UnknownDevice({ fallback }: UnknownDeviceProps): ReactNode {
  return fallback;
}
