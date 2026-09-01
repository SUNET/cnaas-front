import { Container, Icon } from "semantic-ui-react";
import Button from "@mui/material/Button";

import { useAuthToken } from "../../stores/AuthTokenContext";
import { usePermissions } from "../../stores/PermissionsContext";
import { DashboardLinkgrid } from "../DashboardLinkgrid";
import LoginOIDC from "./LoginOIDC";

function Login() {
  const { oidcLogin, logout, loginMessage, loggedIn } = useAuthToken();
  const { permissions } = usePermissions();

  const permissionsLoading = loggedIn && !permissions?.length;
  const permissionsErrorMsg =
    loggedIn &&
    process.env.PERMISSIONS_DISABLED !== "true" &&
    !permissions?.length
      ? "You don't seem to have any permissions. Check with an administrator if this is correct. "
      : "";

  if (loggedIn) {
    globalThis.location.replace("/dashboard");
  }

  if (loggedIn && permissionsLoading) {
    return <Icon name="spinner" loading />;
  }

  if (loggedIn && !permissionsLoading) {
    return (
      <div>
        <p className="title error">{permissionsErrorMsg}</p>
        <Button
          type="button"
          variant="contained"
          className="logout"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Container>
        <LoginOIDC login={oidcLogin} errorMessage={loginMessage} />
        <DashboardLinkgrid />
      </Container>
    </div>
  );
}

export default Login;
