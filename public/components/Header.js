import React from "react";
import { NavLink } from "react-router-dom";

class Header extends React.Component {
  loggedInLinks = () => {
    if (localStorage.getItem("token") !== null) {
      return [
        <NavLink exact activeClassName="active" to={`/devices`}>
          <li>Devices</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/groups`}>
          <li>Groups</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/jobs`}>
          <li>Jobs</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/config-change`}>
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
              <li>Login</li>
            </NavLink>
<<<<<<< HEAD
            {this.loggedInLinks()}
=======
            <NavLink exact activeClassName="active" to={`/devices`}>
              <li>Devices</li>
            </NavLink>
            <NavLink exact activeClassName="active" to={`/groups`}>
              <li>Groups</li>
            </NavLink>
            <NavLink exact activeClassName="active" to={`/jobs`}>
              <li>Jobs</li>
            </NavLink>
            <NavLink exact activeClassName="active" to={`/config-change`}>
              <li>Config change</li>
            </NavLink>
>>>>>>> develop
          </ul>
        </nav>
      </header>
    );
  }
}

export default Header;
