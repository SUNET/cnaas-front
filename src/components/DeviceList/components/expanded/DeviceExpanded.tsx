import type { ReactNode } from "react";

import { isActive, isInZtp, type Device } from "../../../../types/device";
import { useDeviceInterfaces } from "../../hooks/useDeviceInterfaces";
import { useNetboxDevice } from "../../hooks/useNetboxDevice";
import { useNetboxModel } from "../../hooks/useNetboxModel";

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
}

/**
 * Top-level dispatch for the expanded-row panel of a Device.
 *
 * Type-first dispatch: NMS is fundamentally about typed devices in the
 * VXLAN/EVPN fabric (ACCESS / DIST / CORE / FIREWALL). The ZTP states
 * (DHCP_BOOT / DISCOVERED / INIT) are the assembly line that produces
 * typed devices and are grouped under <ZtpDevice>.
 *
 * Calls the cache-aware fetch hooks at the top so per-device caches
 * populate on first expand.
 */
export function DeviceExpanded({ device }: DeviceExpandedProps): ReactNode {
  useDeviceInterfaces(device.id, device.hostname);
  useNetboxDevice(device.id, device.hostname);
  useNetboxModel(device.model);

  if (isInZtp(device)) {
    return <ZtpDevice device={device} />;
  }
  if (device.deleted) {
    return <DeletedDevice device={device} />;
  }
  if (device.state === "PRE_CONFIGURED") {
    return <PreConfiguredDevice device={device} />;
  }
  if (device.state === "UNKNOWN") {
    return <UnknownDevice device={device} />;
  }
  if (isActive(device)) {
    switch (device.device_type) {
      case "ACCESS":
        return <AccessDevice device={device} />;
      case "DIST":
        return <DistDevice device={device} />;
      case "CORE":
        return <CoreDevice device={device} />;
      case "FIREWALL":
        return <FirewallDevice device={device} />;
      case "UNKNOWN":
        return <UnknownDevice device={device} />;
    }
  }
  return <UnknownDevice device={device} />;
}
