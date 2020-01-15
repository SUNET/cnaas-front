import React from "react";
import { NavLink } from "react-router-dom";

class Header extends React.Component {
  render() {
    return (
      <header>
        <nav>
          <ul>
            <NavLink exact activeClassName="active" to={`/`}>
              <li>Login</li>
            </NavLink>
            <NavLink exact activeClassName="active" to={`/devices`}>
              <li>Devices</li>
            </NavLink>
            <NavLink exact activeClassName="active" to={`/config-change`}>
              <li>Config change</li>
            </NavLink>
          </ul>
        </nav>
      </header>
    );
  }
}

export default Header;
