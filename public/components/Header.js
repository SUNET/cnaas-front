import React from "react";
import { NavLink } from "react-router-dom";

class Header extends React.Component {
  loggedInLinks = () => {
    if (localStorage.getItem("token") !== null) {
      return [
        <NavLink exact activeClassName="active" to={`/dashboard`} key="nav1">
          <li>Dashboard</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/devices`} key="nav2">
          <li>Devices</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/groups`} key="nav3">
          <li>Groups</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/jobs`} key="nav4">
          <li>Jobs</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/firmware-copy`} key="nav5">
          <li>Firmware</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/config-change`} key="nav6">
          <li>Config change</li>
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
