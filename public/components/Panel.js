import React from "react";
import DeviceList from "./DeviceList";
import GroupList from "./GroupList";
import JobList from "./JobList";
import ConfigChange from "./ConfigChange/ConfigChange";
import FirmwareUpgrade from "./FirmwareUpgrade/FirmwareUpgrade";
import LoginForm from "./LoginForm";
import ErrorBoundary from "./ErrorBoundary"
import Dashboard from "./Dashboard"
import { Route } from "react-router-dom";

// passible base64 encode function?
function btoaUTF16 (sString) {
  var aUTF16CodeUnits = new Uint16Array(sString.length);
  Array.prototype.forEach.call(aUTF16CodeUnits, function (el, idx, arr) { arr[idx] = sString.charCodeAt(idx); });
  return btoa(String.fromCharCode.apply(null, new Uint8Array(aUTF16CodeUnits.buffer)));
}

class Panel extends React.Component {
  render() {
    return (
      <div id="panel">
        <Route
          exact
          path="/"
          render={props => (
            <LoginForm
              login={this.props.login}
              logout={this.props.logout}
              show={!this.props.loggedIn}
              errorMessage={this.props.loginMessage}
            />
          )}
        />
        <ErrorBoundary>
          <Route
            exact
            path="/dashboard"
            component={Dashboard}
          />
          <Route
            exact
            path="/devices"
            component={DeviceList}
          />
          <Route
            exact
            path="/jobs"
            component={JobList}
          />
          <Route
            exact
            path="/groups"
            component={GroupList}
          />
          <Route
            exact
            path="/config-change"
            component={ConfigChange}
          />
          <Route
            exact
            path="/firmware-upgrade"
            component={FirmwareUpgrade}
          />
        </ErrorBoundary>
      </div>
    );
  }
}

export default Panel;
