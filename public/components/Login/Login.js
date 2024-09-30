import React, { useState } from "react";

import LoginForm from "./LoginForm";
import LoginOIDC from "./LoginOIDC";
import { useAuth } from "../../contexts/AuthContext";

function Login() {
  const { login, oidcLogin, logout, loginMessage, loggedIn } = useAuth();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const setValue = (name, value) => {
    setCredentials({
      ...credentials,
      [name]: value,
    });
  };

  if (loggedIn) {
    const noPermissions =
      process.env.PERMISSIONS_DISABLED !== "true" &&
      !JSON.parse(localStorage.getItem("permissions"))?.length;
    const errorMessageNoPermissions = noPermissions
      ? "You don't seem to have any permissions. Check with an administrator if this is correct. "
      : "";
    return (
      <div>
        <p className="title error">{errorMessageNoPermissions}</p>
        <button type="button" className="logout" onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  if (process.env.OIDC_ENABLED == "true") {
    return <LoginOIDC login={oidcLogin} errorMessage={loginMessage} />;
  }

  return (
    <LoginForm
      handleSubmit={login}
      formValues={credentials}
      setValue={setValue}
      errorMessage={loginMessage}
    />
  );
}

export default Login;
