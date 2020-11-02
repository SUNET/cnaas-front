import React from "react";
import getData from "../../utils/getData";
import { putData } from "../../utils/sendData";

class FirmwareStep1 extends React.Component {
  state = {
    firmwareInfo: {},
  };

  getFirmwareStatus = (group_name) => {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/groups/" + group_name + "/os_version";
    let newCommitInfo = this.state.commitInfo;
    getData(url, credentials).then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            firmwareInfo: data.data
          },
          () => {
            console.log("this is new state", this.state.firmwareInfo);
          }
        );
      }
    });
  };

  componentDidMount() {
    this.getFirmwareStatus(this.props.groupName);
  }

  renderHostname(hostname) {
    return (
      <li><a href={"/devices?filterstring=filter%5Bhostname%5D%3D"+hostname}>{hostname}</a></li>
    );
  }

  render() {
    var os_version_list = <p>None</p>;
    if ('groups' in this.state.firmwareInfo) {
      const os_versions = this.state.firmwareInfo.groups[this.props.groupName];
      os_version_list = Object.keys(os_versions).map((os_version, index) => {
        return (
          <p><b>{os_version}:</b> <ul>{os_versions[os_version].map(this.renderHostname)}</ul></p>
        );
      })
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
            Step 1 of 3: Check currently running OS versions. Use the "Update facts" action on a device in the device list if the OS version listed here does not reflect the actual running version.
          </p>
          <div className="info">
            {os_version_list}
          </div>
        </div>
      </div>
    );
  }
}

export default FirmwareStep1;
