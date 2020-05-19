import React from "react";
import Header from "./Header";
import Panel from "./Panel";
import Footer from "./Footer";
// needed for routing
import { Router } from "react-router-dom";
import { createBrowserHistory } from "history";
import checkResponseStatus from "../utils/checkResponseStatus";
import "../styles/reset.css";
import "../styles/main.css";
// import "../styles/prism.css";

export const history = createBrowserHistory();

class App extends React.Component {
  state = {
    loginMessage: "",
    loggedIn: false
  };

  login = (email, password) => {
    event.preventDefault();
    const url = process.env.API_URL + "/api/v1.0/auth";
    fetch(url, {
      method: "POST",
      headers: {"Authorization": 'Basic ' + btoa(email + ":" + password) }
    })
    .then(response => checkResponseStatus(response))
    .then(response => response.json())
    .then(data => {
      localStorage.setItem("token", data['access_token']);
      this.setState({
        loginMessage: "Login successful",
        loggedIn: true
      });
    })
    .catch(error => {
      localStorage.removeItem("token");
      this.setState({
        loginMessage: error.message,
        loggedIn: false
      });
      console.log(error);
    });
  };

  logout = () => {
    localStorage.removeItem("token");
    this.setState({
      loginMessage: "You have been logged out",
      loggedIn: false
    });
  };

  render() {
    return (
      <div className="container">
        <Router history={history}>
          <Header loggedIn={this.state.loggedIn} />
          <Panel login={this.login} logout={this.logout} loginMessage={this.state.loginMessage} loggedIn={this.state.loggedIn} />
        </Router>
        <Footer />
      </div>
    );
  }
}

export default App;
