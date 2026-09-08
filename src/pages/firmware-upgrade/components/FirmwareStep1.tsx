import { styled } from "@mui/material/styles";
import { Task } from "../../../components/Task";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";
import type { TargetDeviceUpgradeInfo } from "../stores/firmwareUpgradeReducer";

const VersionGroups = styled("dl")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
  gap: "var(--size-md)",
});

function renderHostname(hostname: string) {
  return (
    <li key={hostname}>
      <a href={`/devices?filter[hostname]=${hostname}`}>{hostname}</a>
    </li>
  );
}

/** Group hostnames by their current OS version for display. */
function groupByOsVersion(
  hosts: readonly TargetDeviceUpgradeInfo[],
): Record<string, string[]> {
  const byVersion: Record<string, string[]> = {};
  for (const host of hosts) {
    const version = host.os_version ?? "unknown";
    (byVersion[version] ??= []).push(host.hostname);
  }
  return byVersion;
}

export function FirmwareStep1() {
  const { targetDevices: hostFirmware } = useFirmwareUpgrade();

  let osVersionList = <p>None</p>;
  if (hostFirmware && hostFirmware.length > 0) {
    const byVersion = groupByOsVersion(hostFirmware);
    osVersionList = (
      <>
        {Object.keys(byVersion).map((osVersion) => (
          <div key={osVersion}>
            <dt>{osVersion}:</dt>
            <dd>
              <ul>{byVersion[osVersion].map(renderHostname)}</ul>
            </dd>
          </div>
        ))}
      </>
    );
  }

  return (
    <Task title="Current OS version (1/3)">
      <p>
        Step 1 of 3: Check currently running OS versions. Use the &quot;Update
        facts&quot; action on a device in the device list if the OS version
        listed here does not reflect the actual running version.
      </p>
      <VersionGroups>{osVersionList}</VersionGroups>
    </Task>
  );
}
