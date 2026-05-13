import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceActionsMenu } from "../DeviceActionsMenu";
import { DeviceExtras } from "../DeviceExtras";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

type DistDeviceProps = {
  readonly device: Device;
};

/**
 * Expanded panel for DIST devices in MANAGED / UNMANAGED state.
 *
 * DIST owns: management-domain widget (always; rendered by
 * <DeviceExtras>), port-config menu entry (when `distPortConfig`
 * localStorage flag is set; gated inside getMenuActionsConfig). DIST is
 * the leaf layer of the VXLAN/EVPN fabric — VTEPs live here, ESI pairs
 * the two DIST switches that an ACCESS device uplinks to.
 */
export function DistDevice({ device }: DistDeviceProps): ReactNode {
  const { buildLog, buildNetboxLookups } = useDeviceListActions();
  const { model, netboxDevice } = buildNetboxLookups(device);
  return (
    <DeviceInfoBlock
      device={device}
      menuActions={<DeviceActionsMenu device={device} />}
      deviceStateExtra={<DeviceExtras device={device} />}
      log={buildLog(device.id)}
      model={model}
      netboxDevice={netboxDevice}
    />
  );
}
