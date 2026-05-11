import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

interface DistDeviceProps {
  readonly device: Device;
}

/**
 * Expanded panel for DIST devices in MANAGED / UNMANAGED state.
 *
 * DIST owns: management-domain widget (always; rendered by
 * buildButtonsExtra), port-config menu entry (when `distPortConfig`
 * localStorage flag is set; gated inside getMenuActionsConfig). DIST is
 * the leaf layer of the VXLAN/EVPN fabric — VTEPs live here, ESI pairs
 * the two DIST switches that an ACCESS device uplinks to.
 */
export function DistDevice({ device }: DistDeviceProps): ReactNode {
  const { buildMenuActions, buildButtonsExtra, buildLog, buildNetboxLookups } =
    useDeviceListActions();
  const { model, netboxDevice } = buildNetboxLookups(device);
  return (
    <DeviceInfoBlock
      device={device}
      menuActions={buildMenuActions(device)}
      deviceStateExtra={buildButtonsExtra(device)}
      log={buildLog(device.id)}
      model={model}
      netboxDevice={netboxDevice}
    />
  );
}
