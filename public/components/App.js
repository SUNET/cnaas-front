import React, { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import Panel from "./Panel";
// needed for routing
import "../styles/main.css";
import "../styles/reset.css";
import checkResponseStatus from "../utils/checkResponseStatus";

function App() {
  const [loginMessage, setLoginMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token") !== null) {
      setLoggedIn({ loggedIn: true });
    }
  }, []);

  const login = (event, email, password) => {
    event.preventDefault();
    const url = `${process.env.API_URL}/api/v1.0/auth`;
    const loginString = `${email}:${password}`;
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(loginString)}` },
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => response.json())
      .then((data) => {
        localStorage.setItem("token", data.access_token);
        setLoginMessage("Login successful");
        setLoggedIn(true);
      })
      .catch((error) => {
        localStorage.removeItem("token");
        setLoginMessage(error.message);
        setLoggedIn(false);
        console.log(error);
      });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    setLoginMessage("You have been logged out");
    setLoggedIn(false);
  };

  const oidcLogin = (event) => {
    event.preventDefault();
    const url = `${process.env.API_URL}/api/v1.0/auth/login`;
    window.location.replace(url);
  };

  return (
    <div className="container">
      <BrowserRouter>
        <Header />
        <Panel
          login={login}
          logout={logout}
          oidcLogin={oidcLogin}
          loginMessage={loginMessage}
          loggedIn={loggedIn}
        />
      </BrowserRouter>
      <Footer />
    </div>
  );
}

export default App;
