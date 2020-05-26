import React from "react";
import DeviceList from "./DeviceList";
import GroupList from "./GroupList";
import JobList from "./JobList";
import ConfigChange from "./ConfigChange/ConfigChange";
import LoginForm from "./LoginForm";
import ErrorBoundary from "./ErrorBoundary"
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
            path="/devices"
            render={props => <DeviceList logout={this.logout} />}
          />
          <Route
            exact
            path="/jobs"
            render={props => <JobList logout={this.logout} />}
          />
          <Route
            exact
            path="/groups"
            render={props => <GroupList logout={this.logout} />}
          />
          <Route
            exact
            path="/config-change"
            component={ConfigChange}
  //          render={props => <ConfigChange logout={this.logout} />}
          />
        </ErrorBoundary>
      </div>
    );
  }
}

export default Panel;
