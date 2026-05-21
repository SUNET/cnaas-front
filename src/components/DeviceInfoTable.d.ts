import type { Device } from "../types/device";

export function DeviceInfoTable(props: {
  device: Device | Record<string, unknown>;
  model?: unknown;
  netboxDevice?: unknown;
}): JSX.Element;
