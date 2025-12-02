import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { getData } from "../../utils/getData";

function FirmwareStep1({ commitTarget }) {
  const [firmwareInfo, setFirmwareInfo] = useState({});

  const getFirmwareStatus = useCallback((commitTarget) => {
    const credentials = localStorage.getItem("token");
    if (commitTarget.hostname !== undefined) {
      const url = `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=${commitTarget.hostname}`;
      getData(url, credentials).then((data) => {
        console.log("this should be device data", data);
        {
          setFirmwareInfo(data.data);
          console.log("this is new state", data.data);
        }
      });
    } else if (commitTarget.group !== undefined) {
      const url = `${process.env.API_URL}/api/v1.0/groups/${commitTarget.group}/os_version`;
      getData(url, credentials).then((data) => {
        console.log("this should be group os_version data", data);
        {
          setFirmwareInfo(data.data);
          console.log("this is new state", data.data);
        }
      });
    }
  }, []);

  useEffect(() => {
    getFirmwareStatus(commitTarget);
  }, [commitTarget, getFirmwareStatus]);

  const renderHostname = (hostname) => {
    return (
      <li key={hostname}>
        <a href={`/devices?filter[hostname]=${hostname}`}>{hostname}</a>
      </li>
    );
  };

  let os_version_list = <p>None</p>;
  if ("groups" in firmwareInfo) {
    const os_versions = firmwareInfo.groups[commitTarget.group];
    os_version_list = Object.keys(os_versions).map((os_version) => {
      return (
        <div key={os_version}>
          <p>
            <b>{os_version}:</b>{" "}
          </p>
          <ul>{os_versions[os_version].map(renderHostname)}</ul>
        </div>
      );
    });
  } else if ("devices" in firmwareInfo) {
    os_version_list = (
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
        <div className="info">{os_version_list}</div>
      </div>
    </div>
  );
}

FirmwareStep1.propTypes = {
  commitTarget: PropTypes.object.isRequired,
};

export default FirmwareStep1;
