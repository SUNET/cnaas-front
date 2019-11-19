import React from "react";
import DeviceList from "./DeviceList";
import Workflow from "./Workflow";
import { Route } from "react-router-dom";

class Panel extends React.Component {
  render() {
    console.log("this is props (in panel)", this.props);
    return (
      <div id="panel">
        <Route exact path="/" render={props => <DeviceList {...props} />} />
        <Route exact path="/workflow" component={Workflow} />
      </div>
    );
  }
}

export default Panel;
