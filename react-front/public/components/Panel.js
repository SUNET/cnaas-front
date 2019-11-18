import React from "react";
import DeviceList from "./DeviceList";
import Workflow from "./Workflow";

class Panel extends React.Component {
  render() {
    console.log("this is device data (in panel)", this.props.devicesData);
    return (
      <div id="component">
        <h1> This is the panel</h1>
        {/* <DeviceList devicesData={this.props.devicesData} /> */}
        <Workflow />
      </div>
    );
  }
}

export default Panel;
