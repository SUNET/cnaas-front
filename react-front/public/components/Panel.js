import React from "react";
import DeviceList from "./DeviceList";

class Panel extends React.Component {
  render() {
    console.log("this is device data (in panel)", this.props.devicesData);
    return (
      <div id="component">
        <h1> This is the panel</h1>
        <DeviceList devicesData={this.props.devicesData} />
      </div>
    );
  }
}

export default Panel;
