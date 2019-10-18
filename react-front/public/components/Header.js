import React from "react";

class Header extends React.Component {
  render() {
    return (
      <header>
        <nav>
          <ul>
            <li>
              <a href="#">Item 1</a>
            </li>
            <li>
              <a href="#">Item 2</a>
            </li>
            <li>
              <a href="#">Item 3</a>
            </li>
            <li>
              <a href="#">Item 4</a>
            </li>
          </ul>
        </nav>
      </header>
    );
  }
}

export default Header;
