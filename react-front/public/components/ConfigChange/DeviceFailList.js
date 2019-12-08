import React from "react";

class DeviceFailList extends React.Component {
  render() {
    let failedDeviceNameList = "";
    let devicesObj = this.props.devices;
    // console.log("this is devicesObj", devicesObj);
    // split device object up into a key array and a values array
    const deviceNames = Object.keys(devicesObj);
    const deviceData = Object.values(devicesObj);
    console.log("this deviceData", deviceData);

    const failedDeviceNameObj = deviceData
      .map((status, i) => {
        if (status.failed === true) {
          return i;
        }
        return false;
      });
    
      console.log("failedDeviceNameObj: ", failedDeviceNameObj);

    return (
      <div>
        <ul>{failedDeviceNameList}</ul>
      </div>
    );
  }
}

export default DeviceFailList;
