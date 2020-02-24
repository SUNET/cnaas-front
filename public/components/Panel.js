import React from "react";
import DeviceList from "./DeviceList";
import ConfigChange from "./ConfigChange/ConfigChange";
import LoginForm from "./LoginForm";
import { Route } from "react-router-dom";
import { postData } from "react-router-dom";

class Panel extends React.Component {
  state = {
    token: null,
    showLoginForm: true
    // errorMessage: ""
  };

  login = (email, password) => {
    event.preventDefault();
    console.log("this is email", email);
    console.log("this is password", password);
    // const url = process.env.API_URL + "/api/v1.0/auth";
    // fetch(url, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     email,
    //     password
    //   })
    // })
    //   // .then(res => this.checkStatus(res))
    //   .then(res => res.json())
    //   .then(token => {
    // console.log("this is token", token);
    this.setState(
      {
        showLoginForm: false,
        token:
          "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw"
      },
      () => {
        localStorage.setItem("token", this.state.token);
      }
    );
    // })
    // .catch(error => {
    //   this.setState(
    //     {
    //       showLoginForm: false,
    //       showPortfolioList: false,
    //       showPortfolioDetail: false,
    //       instrumentDetails: false
    //     },
    //     () => {
    //       localStorage.removeItem("token");
    //       this.setState({
    //         showLoginForm: true,
    //         showPortfolioList: false,
    //         showPortfolioDetail: false,
    //         instrumentDetails: false
    //       });
    //     }
    //   );
    // });
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
