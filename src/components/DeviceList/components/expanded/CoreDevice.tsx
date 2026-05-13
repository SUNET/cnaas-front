import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceActionsMenu } from "../DeviceActionsMenu";
import { DeviceExtras } from "../DeviceExtras";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

type CoreDeviceProps = {
  readonly device: Device;
};

/**
 * Expanded panel for CORE devices in MANAGED / UNMANAGED state.
 *
 * CORE is the spine layer in the VXLAN/EVPN fabric. By design CORE has
 * no peer connections, no external connections, no VTEP — it just
 * full-meshes to all DIST switches. The expanded panel is correspondingly
 * sparse: shows the management-domain widget only when the deployment
 * has `MGMT_DOMAIN_CORE_ENABLED` set (handled inside <DeviceExtras>).
 */
export function CoreDevice({ device }: CoreDeviceProps): ReactNode {
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
