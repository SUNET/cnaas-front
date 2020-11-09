import React from "react";
import { NavLink } from "react-router-dom";

class Header extends React.Component {
  loggedInLinks = () => {
    if (localStorage.getItem("token") !== null) {
      return [
        <NavLink exact activeClassName="active" to={`/dashboard`}>
          <li key="nav1">Dashboard</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/devices`}>
          <li key="nav2">Devices</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/groups`}>
          <li key="nav3">Groups</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/jobs`}>
          <li key="nav4">Jobs</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/config-change`}>
          <li key="nav5">Config change</li>
        </NavLink>
      ];
    } else {
      return [];
    }
  }

  render() {
    return (
      <header>
        <nav>
          <h1>CNaaS NMS: {process.env.API_URL.split("/")[2]}</h1>
          <ul>
            <NavLink exact activeClassName="active" to={`/`}>
              <li key="nav1">Login</li>
            </NavLink>
            {this.loggedInLinks()}
          </ul>
        </nav>
      </header>
    );
  }
}

export default Header;
