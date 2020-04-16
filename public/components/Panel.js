import React from "react";
import DeviceList from "./DeviceList";
import ConfigChange from "./ConfigChange/ConfigChange";
import LoginForm from "./LoginForm";
import { Route } from "react-router-dom";
import { postData } from "react-router-dom";
import checkResponseStatus from "../utils/checkResponseStatus";

// passible base64 encode function?
function btoaUTF16 (sString) {
  var aUTF16CodeUnits = new Uint16Array(sString.length);
  Array.prototype.forEach.call(aUTF16CodeUnits, function (el, idx, arr) { arr[idx] = sString.charCodeAt(idx); });
  return btoa(String.fromCharCode.apply(null, new Uint8Array(aUTF16CodeUnits.buffer)));
}

class Panel extends React.Component {
  state = {
    token: null,
    showLoginForm: true
    // errorMessage: ""
  };


  login = (email, password) => {
    event.preventDefault();
    console.log("this is email: ", email);
    const url = process.env.API_URL + "/api/v1.0/auth";
    fetch(url, {
      method: "POST",
      headers: {"Authorization": 'Basic ' + btoa(email + ":" + password) }
    })
    .then(response => checkResponseStatus(response))
    .then(response => response.json())
    .then(data => {
    console.log("this is token: ", data['access_token']);
    this.setState(
      {
        showLoginForm: false,
        token: data['access_token']
      },
      () => {
        localStorage.setItem("token", this.state.token);
      }
    );
    })
    .catch(error => {
      this.setState(
        {
          showLoginForm: false,
        },
        () => {
          localStorage.removeItem("token");
          this.setState({
            showLoginForm: true,
          });
        }
      );
    });
  };

  logout = () => {
    localStorage.removeItem("token");
    this.setState({
      showLoginForm: true,
      errorMessage: "you have logged out"
    });
  };

  render() {
    console.log("this is props (in panel)", this.props);
    return (
      <div id="panel">
        <Route
          exact
          path="/"
          render={props => (
            <LoginForm
              login={this.login}
              logout={this.logout}
              show={this.state.showLoginForm}
            />
          )}
        />
        <Route
          exact
          path="/devices"
          render={props => <DeviceList logout={this.logout} />}
        />
        <Route
          exact
          path="/config-change"
          render={props => <ConfigChange logout={this.logout} />}
        />
      </div>
    );
  }
}

export default Panel;
