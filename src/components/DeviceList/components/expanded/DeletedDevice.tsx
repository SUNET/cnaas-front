import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

interface DeletedDeviceProps {
  readonly device: Device;
}

/**
 * Expanded panel for soft-deleted devices (`device.deleted === true`).
 *
 * Menu shows "No actions allowed" — device is in a recoverable trash
 * state and NMS cannot operate on it until restored. No state-extra,
 * no logs.
 */
export function DeletedDevice({ device }: DeletedDeviceProps): ReactNode {
  const { buildMenuActions, buildLog } = useDeviceListActions();
  return (
    <DeviceInfoBlock
      device={device}
      menuActions={buildMenuActions(device)}
      log={buildLog(device.id)}
    />
  );
}
