import type { ReactNode } from "react";

import type { Device } from "../../../../types/device";
import { useDeviceList } from "../../stores/DeviceListContext";
import { useDeviceListActions } from "../../hooks/useDeviceListActions";
import { DeviceActionsMenu } from "../DeviceActionsMenu";
import { DeviceInfoBlock } from "../DeviceInfoBlock";
import { DeviceInitForm } from "../DeviceInitForm";

type ZtpDeviceProps = {
  readonly device: Device;
};

/**
 * Expanded panel for devices in the Zero Touch Provisioning lifecycle.
 *
 * ZTP states: DHCP_BOOT → DISCOVERED → INIT → (becomes MANAGED with
 * concrete device_type, exits ZTP). Each state has a distinct extra:
 *
 *   - DHCP_BOOT: no extra. Action menu: Delete + Change hostname.
 *   - DISCOVERED: <DeviceInitForm>. Action menu: Delete only.
 *   - INIT: "Init jobs: …" line. No actions.
 */
export function ZtpDevice({ device }: ZtpDeviceProps): ReactNode {
  const { state } = useDeviceList();
  const { addDeviceJob, buildLog, buildNetboxLookups } = useDeviceListActions();
  const { model, netboxDevice } = buildNetboxLookups(device);

  let extra: ReactNode = null;
  if (device.state === "DISCOVERED") {
    extra = (
      <DeviceInitForm
        key={`${device.id}_initform`}
        deviceId={device.id}
        jobIdCallback={addDeviceJob}
      />
    );
  } else if (device.state === "INIT") {
    const jobs = state.deviceJobs[device.id];
    if (jobs && jobs.length > 0) {
      extra = <p key="initjobs">Init jobs: {jobs.join(", ")}</p>;
    }
  }

  return (
    <DeviceInfoBlock
      device={device}
      menuActions={<DeviceActionsMenu device={device} />}
      deviceStateExtra={extra}
      log={buildLog(device.id)}
      model={model}
      netboxDevice={netboxDevice}
    />
  );
}
