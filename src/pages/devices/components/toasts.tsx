import Button from "@mui/material/Button";
import { dismissAllToasts, showToast } from "../../../components/toast";

import type { Device } from "../../../types/device";

type DeviceEvent = {
  readonly device_id: number;
  readonly hostname: string;
  readonly object: Device;
};

export function showDeviceDiscoveredToast(
  data: DeviceEvent,
  onGoToDevice: (deviceId: number) => void,
): void {
  showToast({
    severity: "info",
    title: `Device discovered: ${data.hostname}`,
    message: (
      <>
        Model: {data.object.model}, Serial: {data.object.serial}
        <br />
        <Button
          variant="text"
          size="small"
          onClick={() => {
            dismissAllToasts();
            onGoToDevice(data.device_id);
          }}
        >
          Go to device
        </Button>
      </>
    ),
  });
}

export function showDeviceCreatedToast(
  data: DeviceEvent,
  onGoToDevice: (deviceId: number) => void,
): void {
  showToast({
    severity: "info",
    title: `Device added: ${data.hostname}`,
    message: (
      <>
        State: {data.object.state}
        <br />
        <Button
          variant="text"
          size="small"
          onClick={() => {
            dismissAllToasts();
            onGoToDevice(data.device_id);
          }}
        >
          Go to device
        </Button>
      </>
    ),
  });
}
