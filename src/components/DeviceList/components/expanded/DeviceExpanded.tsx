import type { ReactNode } from "react";

import { isActive, isInZtp, type Device } from "../../../../types/device";

import { AccessDevice } from "./AccessDevice";
import { CoreDevice } from "./CoreDevice";
import { DeletedDevice } from "./DeletedDevice";
import { DistDevice } from "./DistDevice";
import { FirewallDevice } from "./FirewallDevice";
import { PreConfiguredDevice } from "./PreConfiguredDevice";
import { UnknownDevice } from "./UnknownDevice";
import { ZtpDevice } from "./ZtpDevice";

interface DeviceExpandedProps {
  readonly device: Device;
  readonly fallback: ReactNode;
}

/**
 * Top-level dispatch for the expanded-row panel of a Device.
 *
 * Type-first dispatch: NMS is fundamentally about typed devices in the
 * VXLAN/EVPN fabric (ACCESS / DIST / CORE / FIREWALL). The ZTP states
 * (DHCP_BOOT / DISCOVERED / INIT) are the assembly line that produces
 * typed devices and are grouped under <ZtpDevice>.
 *
 * `fallback` is rendered for any branch not yet migrated from the
 * legacy `mangleDeviceData` function. It is removed in Phase E once all
 * branches are migrated.
 */
export function DeviceExpanded({
  device,
  fallback,
}: DeviceExpandedProps): ReactNode {
  if (isInZtp(device)) {
    return <ZtpDevice device={device} fallback={fallback} />;
  }
  if (device.deleted) {
    return <DeletedDevice device={device} fallback={fallback} />;
  }
  if (device.state === "PRE_CONFIGURED") {
    return <PreConfiguredDevice device={device} fallback={fallback} />;
  }
  if (device.state === "UNKNOWN") {
    return <UnknownDevice device={device} fallback={fallback} />;
  }
  if (isActive(device)) {
    switch (device.device_type) {
      case "ACCESS":
        return <AccessDevice device={device} fallback={fallback} />;
      case "DIST":
        return <DistDevice device={device} fallback={fallback} />;
      case "CORE":
        return <CoreDevice device={device} fallback={fallback} />;
      case "FIREWALL":
        return <FirewallDevice device={device} fallback={fallback} />;
      case "UNKNOWN":
        return <UnknownDevice device={device} fallback={fallback} />;
    }
  }
  return fallback;
}
