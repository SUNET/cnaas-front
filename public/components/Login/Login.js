import React, { useState } from "react";

import LoginForm from "./LoginForm";
import LoginOIDC from "./LoginOIDC";

function Login({ show, login, logout, oidcLogin, errorMessage }) {
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

  if (!show) {
    const noPermissions =
      process.env.PERMISSIONS_DISABLED !== "true" &&
      !JSON.parse(localStorage.getItem("permissions")).length;
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
    return <LoginOIDC login={oidcLogin} errorMessage={errorMessage} />;
  }

  return (
    <LoginForm
      handleSubmit={login}
      formValues={credentials}
      setValue={setValue}
      errorMessage={errorMessage}
    />
  );
}

export default Login;
