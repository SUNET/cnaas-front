import { Button } from "semantic-ui-react";

import type { Device } from "../../../types/device";
import { isCoreDevice, isDistDevice } from "../../../types/device";
import { useDeviceList } from "../stores/DeviceListContext";
import { MgmtDomainButton } from "./MgmtDomainButton";
import { MlagButtons } from "./MlagButtons";
import { UplinkButtons } from "./UplinkButtons";

type DeviceExtrasProps = {
  readonly device: Device;
};

/**
 * Per-type extras shown in the expanded-row state column:
 *   - MLAG / uplink buttons derived from cached interface data
 *   - Management-domain widget for DIST (always) / CORE (when enabled)
 *
 * Renders nothing when none of these apply.
 */
export function DeviceExtras({ device }: DeviceExtrasProps) {
  const { state } = useDeviceList();
  const interfaces = state.deviceInterfaceData[device.id];

  const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
  const showMgmtDomain =
    isDistDevice(device) || (includeCore && isCoreDevice(device));

  if (!interfaces && !showMgmtDomain) return null;

  return (
    <div key="btngroup">
      <Button.Group vertical labeled icon>
        {interfaces && <MlagButtons interfaces={interfaces} />}
        {interfaces && <UplinkButtons interfaces={interfaces} />}
        {showMgmtDomain && <MgmtDomainButton device={device} />}
      </Button.Group>
    </div>
  );
}
