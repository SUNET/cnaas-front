import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceInfoBlock } from "../DeviceInfoBlock";

interface FirewallDeviceProps {
  readonly device: Device;
}

/**
 * Expanded panel for FIREWALL devices in MANAGED / UNMANAGED state.
 *
 * Sparse panel — FIREWALL sits at the network edge with the standard
 * MANAGED action menu but no fabric-specific widgets. Interface buttons
 * (MLAG/uplink) appear if any are configured.
 */
export function FirewallDevice({ device }: FirewallDeviceProps): ReactNode {
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
