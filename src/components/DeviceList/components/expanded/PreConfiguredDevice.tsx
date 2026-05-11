import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

type PreConfiguredDeviceProps = {
  readonly device: Device;
};

/**
 * Expanded panel for `PRE_CONFIGURED` devices.
 *
 * Best current understanding: a device that has a configuration which
 * NMS may overwrite in the future (e.g. operator staged a device before
 * the hardware physically arrived). May be merged with the broader
 * "no actions allowed" fallback later, after consulting domain experts.
 */
export function PreConfiguredDevice({
  device,
}: PreConfiguredDeviceProps): ReactNode {
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
