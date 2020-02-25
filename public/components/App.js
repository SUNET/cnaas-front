import React from "react";
import Header from "./Header";
import Panel from "./Panel";
import Footer from "./Footer";
// needed for routing
import { Router } from "react-router-dom";
import { createBrowserHistory } from "history";
import "../styles/reset.css";
import "../styles/main.css";
// import "../styles/prism.css";

export const history = createBrowserHistory();

class App extends React.Component {
  render() {
    return (
      <div className="container">
        <Router history={history}>
          <Header />
          <Panel />
        </Router>
        <Footer />
      </div>
    );
  }
}

export default App;
