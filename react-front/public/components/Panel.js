import React from "react";
import DeviceList from "./DeviceList";
import ConfigChange from "./ConfigChange/ConfigChange";
import { Route } from "react-router-dom";

class Panel extends React.Component {
  render() {
    console.log("this is props (in panel)", this.props);
    return (
      <div id="panel">
        <Route exact path="/" component={DeviceList} />
        <Route exact path="/config-change" component={ConfigChange} />
      </div>
    );
  }
}

export default Panel;
