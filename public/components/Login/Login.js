import React, { useEffect, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import LoginForm from "./LoginForm";
import LoginOIDC from "./LoginOIDC";

function Login() {
  const { login, oidcLogin, logout, loginMessage, loggedIn, permissions } =
    useAuth();
  const [permissionsErrorMsg, setPermissionsErrorMsg] = useState("");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const noPermissions =
      process.env.PERMISSIONS_DISABLED !== "true" &&
      !JSON.parse(localStorage.getItem("permissions"))?.length;
    setPermissionsErrorMsg(
      noPermissions
        ? "You don't seem to have any permissions. Check with an administrator if this is correct. "
        : "",
    );
  }, [loggedIn, permissions]);

  const setValue = (name, value) => {
    setCredentials({
      ...credentials,
      [name]: value,
    });
  };

  if (loggedIn) {
    return (
      <div>
        <p className="title error">{permissionsErrorMsg}</p>
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
