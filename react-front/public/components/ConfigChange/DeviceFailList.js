import React from "react";

class DeviceFailList extends React.Component {
  render() {
    let failedDeviceNameList = "";
    let devicesObj = this.props.devices;
    // split device object up into a key array and a values array
    const deviceNames = Object.keys(devicesObj);
    const deviceData = Object.values(devicesObj);
    // console.log("this deviceData", deviceData);

    // takes values array and creates a new object
    // pairing failing device names with their position in the
    const failedDeviceNameObj = deviceData
      // create a new array: add index values of devices with
      // "falied: true" (otherwise add "false")
      .map((status, i) => {
        if (status.failed === true) {
          return i;
        }
        return false;
      })
      // filter out non-index values
      .filter(status => status !== false)
      // create a new object using the index array and the name array
      .reduce((obj, key) => {
        obj[key] = deviceNames[key];
        return obj;
      }, {});
    // console.log("failedDeviceNameObj: ", failedDeviceNameObj);

    return (
      <div>
        <ul>{failedDeviceNameList}</ul>
      </div>
    );
  }
}

export default DeviceFailList;
