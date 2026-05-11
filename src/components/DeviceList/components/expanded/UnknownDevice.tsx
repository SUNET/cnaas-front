import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

interface UnknownDeviceProps {
  readonly device: Device;
}

/**
 * Defensive fallback panel for devices in an unrecognised configuration.
 *
 * Reached from two distinct dispatch branches:
 *   - `state === "UNKNOWN"` — defensive against backend reporting an
 *     unrecognised state literal.
 *   - `device_type === "UNKNOWN"` while in an active state — should
 *     never occur in practice (typing happens during ZTP) but the
 *     compiler requires the branch for exhaustiveness.
 *
 * `getMenuActionsConfig` returns `[noAction]` for unknown states.
 */
export function UnknownDevice({ device }: UnknownDeviceProps): ReactNode {
  const { buildMenuActions, buildLog, buildNetboxLookups } =
    useDeviceListActions();
  const { model, netboxDevice } = buildNetboxLookups(device);
  return (
    <DeviceInfoBlock
      device={device}
      menuActions={buildMenuActions(device)}
      log={buildLog(device.id)}
      model={model}
      netboxDevice={netboxDevice}
    />
  );
}
