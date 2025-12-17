import { useEffect, useState } from "react";
import { getData } from "../../utils/getData";
import { useAuthToken } from "../../contexts/AuthTokenContext";

export function FirmwareStep1({ commitTarget }) {
  const { token } = useAuthToken();
  const [firmwareInfo, setFirmwareInfo] = useState({});

  const getFirmwareStatus = async (commitTarget) => {
    if (commitTarget.hostname) {
      const url = `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=${commitTarget.hostname}`;
      const data = await getData(url, token);
      return data.data;
    } else if (commitTarget.group) {
      const url = `${process.env.API_URL}/api/v1.0/groups/${commitTarget.group}/os_version`;
      const data = await getData(url, token);
      return data.data;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const newFirmwareStatus = await getFirmwareStatus(commitTarget);
      setFirmwareInfo(newFirmwareStatus);
    };
    fetchData();
  }, []);

  const renderHostname = (hostname) => {
    return (
      <li key={hostname}>
        <a href={`/devices?filter[hostname]=${hostname}`}>{hostname}</a>
      </li>
    );
  };

  let osVersionList = <p>None</p>;
  if ("groups" in firmwareInfo) {
    const osVersions = firmwareInfo.groups[commitTarget.group];
    osVersionList = Object.keys(osVersions).map((osVersion) => {
      return (
        <div key={osVersion}>
          <p>
            <b>{osVersion}:</b>{" "}
          </p>
          <ul>{osVersions[osVersion].map(renderHostname)}</ul>
        </div>
      );
    });
  } else if ("devices" in firmwareInfo) {
    osVersionList = (
      <div key="device">
        <p>
          <b>{firmwareInfo.devices[0].os_version}:</b>{" "}
        </p>
        <ul>{renderHostname(firmwareInfo.devices[0].hostname)}</ul>
      </div>
    );
  }

  return (
    <div className="task-container">
      <div className="heading">
        <h2>Current OS version (1/3)</h2>
        <a href="#">
          <button className="close">Close</button>
        </a>
      </div>
      <div className="task-collapsable">
        <p>
          Step 1 of 3: Check currently running OS versions. Use the "Update
          facts" action on a device in the device list if the OS version listed
          here does not reflect the actual running version.
        </p>
        <div className="info">{osVersionList}</div>
      </div>
    </div>
  );
}
