import { useEffect, useState } from "react";
import { Icon, Container } from "semantic-ui-react";

import { useAuthToken } from "../../contexts/AuthTokenContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import LoginForm from "./LoginForm";
import LoginOIDC from "./LoginOIDC";
import DashboardLinkgrid from "../DashboardLinkgrid";

function Login() {
  const { login, oidcLogin, logout, loginMessage, loggedIn } = useAuthToken();
  const { permissions } = usePermissions();
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsErrorMsg, setPermissionsErrorMsg] = useState("");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (loggedIn) {
      const noPermissions =
        process.env.PERMISSIONS_DISABLED !== "true" && !permissions?.length;

      setPermissionsErrorMsg(
        noPermissions
          ? "You don't seem to have any permissions. Check with an administrator if this is correct. "
          : "",
      );
      setPermissionsLoading(!permissions?.length);
    }
  }, [loggedIn, permissions]);

  const setValue = (name, value) => {
    setCredentials({
      ...credentials,
      [name]: value,
    });
  };

  if (loggedIn) {
    window.location.replace("/dashboard");
  }

  if (loggedIn && permissionsLoading) {
    return <Icon name="spinner" loading />;
  }

  if (loggedIn && !permissionsLoading) {
    return (
      <div>
        <p className="title error">{permissionsErrorMsg}</p>
        <button type="button" className="logout" onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  let loginForm = null;
  if (process.env.OIDC_ENABLED === "true") {
    loginForm = <LoginOIDC login={oidcLogin} errorMessage={loginMessage} />;
  } else {
    loginForm = (
      <LoginForm
        handleSubmit={login}
        formValues={credentials}
        setValue={setValue}
        errorMessage={loginMessage}
      />
    );
  }

  return (
    <div>
      <Container>
        {loginForm}
        <DashboardLinkgrid />
      </Container>
    </div>
  );
}

export default Login;
