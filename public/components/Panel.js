import React from "react";
import { Route } from "react-router-dom";
import PropTypes from "prop-types";
import DeviceList from "./DeviceList/DeviceList";
import GroupList from "./GroupList";
import JobList from "./JobList";
import ConfigChange from "./ConfigChange/ConfigChange";
import FirmwareUpgrade from "./FirmwareUpgrade/FirmwareUpgrade";
import FirmwareCopy from "./FirmwareCopy";
import LoginForm from "./LoginForm";
import ErrorBoundary from "./ErrorBoundary";
import Dashboard from "./Dashboard";
import InterfaceConfig from "./InterfaceConfig/InterfaceConfig";
import Callback from "./Callback";

// passible base64 encode function?
function btoaUTF16(sString) {
  const aUTF16CodeUnits = new Uint16Array(sString.length);
  Array.prototype.forEach.call(aUTF16CodeUnits, function (el, idx, arr) {
    arr[idx] = sString.charCodeAt(idx);
  });
  return btoa(
    String.fromCharCode.apply(null, new Uint8Array(aUTF16CodeUnits.buffer)),
  );
}

class Panel extends React.Component {
  render() {
    return (
      <div id="panel">
        <Route
          exact
          path="/"
          render={(props) => (
            <LoginForm
              login={this.props.login}
              logout={this.props.logout}
              show={!this.props.loggedIn}
              errorMessage={this.props.loginMessage}
              oauthLogin={this.props.oauthLogin}
            />
          )}
        />
        <Route exact path="/callback" component={Callback} />
        <ErrorBoundary>
          <Route exact path="/dashboard" component={Dashboard} />
          <Route exact path="/devices" component={DeviceList} />
          <Route exact path="/jobs" component={JobList} />
          <Route exact path="/groups" component={GroupList} />
          <Route exact path="/config-change" component={ConfigChange} />
          <Route exact path="/firmware-upgrade" component={FirmwareUpgrade} />
          <Route exact path="/firmware-copy" component={FirmwareCopy} />
          <Route exact path="/interface-config" component={InterfaceConfig} />
        </ErrorBoundary>
      </div>
    );
  }
}
Panel.propTypes = {
  login: PropTypes.func,
  oauthLogin: PropTypes.func,
  logout: PropTypes.func,
  loggedIn: PropTypes.bool,
  loginMessage: PropTypes.string,
};
export default Panel;
