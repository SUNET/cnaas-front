import { Button } from "semantic-ui-react";
import { toast } from "react-semantic-toasts-2";

import type { Device } from "../../../types/device";

interface DeviceEvent {
  readonly device_id: number;
  readonly hostname: string;
  readonly object: Device;
}

// Removes any other floating toasts from the DOM. Mirrors legacy behavior of
// the "Go to device" action in DeviceList toasts.
function dismissFloatingMessages(): void {
  document
    .querySelectorAll(".ui.floating.message")
    .forEach((el) => el.remove());
}

export function showDeviceDiscoveredToast(
  data: DeviceEvent,
  onGoToDevice: (deviceId: number) => void,
): void {
  toast({
    type: "info",
    icon: "paper plane",
    title: `Device discovered: ${data.hostname} `,
    description: (
      <p>
        Model: {data.object.model}, Serial: {data.object.serial}
        <br />
        <Button
          basic
          compact
          onClick={() => {
            dismissFloatingMessages();
            onGoToDevice(data.device_id);
          }}
        >
          Go to device
        </Button>
      </p>
    ),
    animation: "bounce",
    time: 0,
    // `react-semantic-toasts-2` types description as string; localised cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

export function showDeviceCreatedToast(
  data: DeviceEvent,
  onGoToDevice: (deviceId: number) => void,
): void {
  toast({
    type: "info",
    icon: "paper plane",
    title: `Device added: ${data.hostname}`,
    description: (
      <p>
        State: {data.object.state}
        <br />
        <Button
          basic
          compact
          onClick={() => {
            dismissFloatingMessages();
            onGoToDevice(data.device_id);
          }}
        >
          Go to device
        </Button>
      </p>
    ),
    animation: "bounce",
    time: 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}
