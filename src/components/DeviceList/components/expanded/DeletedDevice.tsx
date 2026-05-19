import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceActionsMenu } from "../DeviceActionsMenu";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

type DeletedDeviceProps = {
  readonly device: Device;
};

/**
 * Expanded panel for soft-deleted devices (`device.deleted === true`).
 *
 * Menu shows "No actions allowed" — device is in a recoverable trash
 * state and NMS cannot operate on it until restored. No state-extra.
 * Existing log entries (from before deletion) are still shown.
 */
export function DeletedDevice({ device }: DeletedDeviceProps): ReactNode {
  const { buildLog } = useDeviceListActions();
  return (
    <DeviceInfoBlock
      device={device}
      menuActions={<DeviceActionsMenu device={device} />}
      log={buildLog(device.id)}
    />
  );
}
