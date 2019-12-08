import React from "react";

class DeviceFailList extends React.Component {
  render() {
    let failedDeviceNameList = "";
    let devicesObj = this.props.devices;
    console.log("this is devicesObj", devicesObj);

    return (
      <div>
        <ul>{failedDeviceNameList}</ul>
      </div>
    );
  }
}

export default DeviceFailList;
