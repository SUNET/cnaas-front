import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Button,
  Icon,
  Modal,
  ModalActions,
  ModalContent,
  Header as SemanticHeader,
} from "semantic-ui-react";
import {
  getSecondsUntilExpiry,
  useAuthToken,
} from "../contexts/AuthTokenContext";
import { usePermissions } from "../contexts/PermissionsContext";
import JwtInfo from "./JwtInfo";

function Header() {
  const { logout, oidcLogin, token, tokenWillExpire } = useAuthToken();
  const { permissionsCheck } = usePermissions();

  const [reloginModalOpen, setReloginModalOpen] = useState(false);

  useEffect(() => {
    setReloginModalOpen(tokenWillExpire);
  }, [tokenWillExpire]);

  const relogin = () => {
    logout();
    oidcLogin();
  };

  const renderLinks = () => {
    if (!token) {
      return [
        <NavLink exact activeClassName="active" to="/" key="navlogin">
          <li key="nav1">Login</li>
        </NavLink>,
      ];
    }

    return [
      <NavLink
        exact
        activeClassName="active"
        hidden={!permissionsCheck("Dashboard", "read")}
        to="/dashboard"
        key="nav1"
      >
        <li>Dashboard</li>
      </NavLink>,
      <NavLink
        exact
        activeClassName="active"
        hidden={!permissionsCheck("Devices", "read")}
        to="/devices"
        key="nav2"
      >
        <li>Devices</li>
      </NavLink>,
      <NavLink
        exact
        activeClassName="active"
        hidden={!permissionsCheck("Groups", "read")}
        to="/groups"
        key="nav3"
      >
        <li>Groups</li>
      </NavLink>,
      <NavLink
        exact
        activeClassName="active"
        hidden={!permissionsCheck("Jobs", "read")}
        to="/jobs"
        key="nav4"
      >
        <li>Jobs</li>
      </NavLink>,
      <NavLink
        exact
        activeClassName="active"
        hidden={!permissionsCheck("Firmware", "read")}
        to="/firmware-copy"
        key="nav5"
      >
        <li>Firmware</li>
      </NavLink>,
      <NavLink
        exact
        activeClassName="active"
        hidden={!permissionsCheck("Config change", "read")}
        to="/config-change"
        key="nav6"
      >
        <li>Config change</li>
      </NavLink>,
      <JwtInfo key="navjwtinfo" />,
    ];
  };

  const secondsUntilExpiry = getSecondsUntilExpiry(token);
  const expireString =
    secondsUntilExpiry === 0
      ? "Your session has expired and you will now be logged out"
      : `Your session will time out in (less than) ${Math.floor(secondsUntilExpiry / 60)} minutes, after this you will be logged out`;

  return (
    <header>
      <nav>
        <h1>CNaaS NMS: {process.env.API_URL.split("/")[2]}</h1>
        <ul>{renderLinks()}</ul>
        <Modal
          basic
          closeIcon
          onClose={() => setReloginModalOpen(false)}
          open={reloginModalOpen}
          size="small"
        >
          <SemanticHeader icon>
            <Icon name="time" />
            Session timeout
          </SemanticHeader>
          <ModalContent>
            <p>{expireString}</p>
          </ModalContent>
          <ModalActions>
            <Button color="red" inverted onClick={logout}>
              <Icon name="sign-out" /> Log out
            </Button>
            <Button color="green" inverted onClick={relogin}>
              <Icon name="refresh" /> Log in again
            </Button>
          </ModalActions>
        </Modal>
      </nav>
    </header>
  );
}

export default Header;
