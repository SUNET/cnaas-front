import React from "react";

class FirmwareError extends React.Component {
  render() {
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

    // pull out the names into an array and render
    const failedDeviceNames = Object.values(failedDeviceNameObj);
    let failedDeviceNameList = failedDeviceNames.map((name, i) => {
      return (
        <li key={i}>
          <p className="error" key="0">
            {name}
          </p>
        </li>
      );
    });

    return (
      <div>
        <ul>{failedDeviceNameList}</ul>
      </div>
    );
  }
}

export default FirmwareError;
