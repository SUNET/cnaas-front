import { useEffect, useState } from "react";
import {
  fetchDeviceOsVersion,
  fetchGroupOsVersion,
  type CommitTarget,
  type DeviceOsVersionData,
  type GroupOsVersionData,
} from "../api/firmwareUpgradeApi";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";

type FirmwareInfo = DeviceOsVersionData | GroupOsVersionData | null;

function renderHostname(hostname: string) {
  return (
    <li key={hostname}>
      <a href={`/devices?filter[hostname]=${hostname}`}>{hostname}</a>
    </li>
  );
}

export function FirmwareStep1() {
  const { token } = useAuthToken();
  const { commitTarget } = useFirmwareUpgrade();
  const [firmwareInfo, setFirmwareInfo] = useState<FirmwareInfo>(null);

  const getFirmwareStatus = async (
    target: CommitTarget,
  ): Promise<FirmwareInfo> => {
    if (target.hostname) {
      return fetchDeviceOsVersion(target.hostname, token);
    } else if (target.group) {
      return fetchGroupOsVersion(target.group, token);
    }
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      const newFirmwareStatus = await getFirmwareStatus(commitTarget);
      setFirmwareInfo(newFirmwareStatus);
    };
    fetchData();
  }, []);

  let osVersionList = <p>None</p>;
  if (firmwareInfo && "groups" in firmwareInfo && commitTarget.group) {
    const osVersions = firmwareInfo.groups[commitTarget.group];
    osVersionList = (
      <>
        {Object.keys(osVersions).map((osVersion) => (
          <div key={osVersion}>
            <p>
              <b>{osVersion}:</b>{" "}
            </p>
            <ul>{osVersions[osVersion].map(renderHostname)}</ul>
          </div>
        ))}
      </>
    );
  } else if (firmwareInfo && "devices" in firmwareInfo) {
    const device = firmwareInfo.devices[0];
    osVersionList = (
      <div key="device">
        <p>
          <b>{device.os_version}:</b>{" "}
        </p>
        <ul>{renderHostname(device.hostname)}</ul>
      </div>
    );
  }

  return (
    <div className="task-container">
      <div className="heading">
        <h2>Current OS version (1/3)</h2>
        <button className="close">Close</button>
      </div>
      <div className="task-collapsable">
        <p>
          Step 1 of 3: Check currently running OS versions. Use the &quot;Update
          facts&quot; action on a device in the device list if the OS version
          listed here does not reflect the actual running version.
        </p>
        <div className="info">{osVersionList}</div>
      </div>
    </div>
  );
}
