import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceInfoBlock } from "../DeviceInfoBlock";
import { DeviceReplaceForm } from "../DeviceReplaceForm";

interface AccessDeviceProps {
  readonly device: Device;
}

/**
 * Expanded panel for ACCESS devices in MANAGED / UNMANAGED state.
 *
 * ACCESS lives below the VXLAN fabric and is dual-homed via LACP to a
 * DIST pair. ACCESS owns:
 *   - Replace flow: when `state === "UNMANAGED (Replacing)"`, the panel
 *     hosts <DeviceReplaceForm>; "Replace device..." menu entry on
 *     MANAGED opens the device-state modal that transitions there.
 *   - Configure-ports menu entry (always for ACCESS).
 *   - Interface buttons (MLAG / uplink) via buildButtonsExtra.
 */
export function AccessDevice({ device }: AccessDeviceProps): ReactNode {
  const {
    addDeviceJob,
    buildMenuActions,
    buildButtonsExtra,
    buildLog,
    buildNetboxLookups,
    changeStateLocally,
  } = useDeviceListActions();
  const { model, netboxDevice } = buildNetboxLookups(device);

  const extras: ReactNode[] = [];
  if (device.state === "UNMANAGED (Replacing)") {
    extras.push(
      <DeviceReplaceForm
        key={`${device.id}_replaceform`}
        hostname={device.hostname}
        deviceType={device.device_type}
        deviceId={device.id}
        deviceModel={device.model}
        jobIdCallback={addDeviceJob}
        clearCandidate={() => changeStateLocally(device.id, "UNMANAGED")}
      />,
    );
  }
  const buttons = buildButtonsExtra(device);
  if (buttons) extras.push(buttons);

  return (
    <DeviceInfoBlock
      device={device}
      menuActions={buildMenuActions(device)}
      deviceStateExtra={extras.length > 0 ? extras : undefined}
      log={buildLog(device.id)}
      model={model}
      netboxDevice={netboxDevice}
    />
  );
}
