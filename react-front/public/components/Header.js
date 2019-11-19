import React from "react";
import { NavLink } from "react-router-dom";

class Header extends React.Component {
  render() {
    return (
      <header>
        <nav>
          <ul>
            <NavLink
              exact
              activeClassName="active"
              to={`/`}
            >
              <li>Devices</li>
            </NavLink>
            <NavLink
              exact
              activeClassName="active"
              to={`/workflow`}
            >
              <li>Workflow</li>
            </NavLink>
          </ul>
        </nav>
      </header>
    );
  }
}

export default Header;
