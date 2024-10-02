import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Button,
  Icon,
  Loader,
  Modal,
  ModalActions,
  ModalContent,
  Popup,
  Header as SemanticHeader,
} from "semantic-ui-react";
import { useAuth } from "../contexts/AuthContext";
import permissionsCheck from "../utils/permissions/permissionsCheck";
import { postData } from "../utils/sendData";

function Header() {
  const { token, updateToken, username, oidcLogin, logout } = useAuth();

  const [jwtInfo, setJwtInfo] = useState([
    <Loader key="loading" inline active />,
  ]);
  const [reloginModalOpen, setReloginModalOpen] = useState(false);

  let tokenExpireTimer = null;
  let tokenExpiryTimestamp = 0;
  let triggerTokenRefresh = false;

  const getJwtInfo = () => {
    try {
      const decodedToken = jwtDecode(token);

      const now = Math.round(Date.now() / 1000);
      const secondsUntilExpiry = decodedToken.exp - now;
      tokenExpiryTimestamp = decodedToken.exp;

      return secondsUntilExpiry;
    } catch {
      tokenExpiryTimestamp = -1;
      return -1;
    }
  };

  const refreshNow = () => {
    window.clearTimeout(tokenExpireTimer);
    tokenExpireTimer = null;
    triggerTokenRefresh = true;
    setJwtInfo([<Loader key="loading" inline active />]);
  };

  const relogin = () => {
    logout();
    oidcLogin();
  };

  const putJwtInfo = () => {
    const secondsUntilExpiry = getJwtInfo();

    const expiryString =
      secondsUntilExpiry < 0
        ? `Token exired ${Math.round(Math.abs(secondsUntilExpiry) / 60)} minutes ago`
        : `Token valid for ${Math.round(Math.abs(secondsUntilExpiry) / 60)} more minutes`;

    const userinfo =
      username !== null
        ? `Logged in as ${username}`
        : "Unknown user (username attribute missing)";

    setJwtInfo([
      <p key="userinfo">{userinfo}</p>,
      <p key="exp" className={secondsUntilExpiry < 0 ? "tokenexpired" : ""}>
        {expiryString}
      </p>,
      <p key="jwtcopyrefresh">
        <Popup
          content="Copy JWT (to use from curl etc), take note of valid time listed above"
          trigger={
            <Button
              onClick={() => navigator.clipboard.writeText(token)}
              icon="copy"
              size="tiny"
            />
          }
          position="bottom right"
        />
        <Popup
          content="Try to refresh the access token now, if it can't be refresh automatically you will be asked to log in again"
          trigger={<Button onClick={refreshNow} icon="refresh" size="tiny" />}
          position="bottom right"
        />
      </p>,
      <p key="logout">
        <Button onClick={logout}>Log out</Button>
      </p>,
    ]);
  };

  const renderLinks = () => {
    if (token === null) {
      return [
        <NavLink exact activeClassName="active" to="/" key="navlogin">
          <li key="nav1">Login</li>
        </NavLink>,
      ];
    }

    if (tokenExpireTimer === null && process.env.OIDC_ENABLED == "true") {
      let secondsUntilExpiry = null;
      if (triggerTokenRefresh === true) {
        secondsUntilExpiry = 0;
      } else {
        secondsUntilExpiry = getJwtInfo();
      }
      tokenExpireTimer = setTimeout(
        () => {
          // try to refresh token silently first
          const url = `${process.env.API_URL}/api/v1.0/auth/refresh`;
          postData(url, token, {})
            .then((data) => {
              updateToken(data.data.access_token);
              const oldExpiry = tokenExpiryTimestamp;
              getJwtInfo();
              if (oldExpiry == tokenExpiryTimestamp) {
                console.log(
                  "Refresh of access token failed, session will time out",
                );
                setReloginModalOpen(true);
              } else {
                window.clearTimeout(tokenExpireTimer);
                tokenExpireTimer = null;
                if (triggerTokenRefresh === true) {
                  triggerTokenRefresh = false;
                  putJwtInfo();
                } else {
                  // trigger refresh of profile info, unless refreshNow already triggered it
                  setJwtInfo([<Loader key="loading" inline active />]);
                }
              }
            })
            .catch((error) => {
              console.log(
                "Refresh of access token failed, session will time out",
              );
              console.log(error);
              setReloginModalOpen(true);
            });
        },
        (secondsUntilExpiry - 120) * 1000,
      );
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
      <Popup
        key="profile"
        hoverable
        content={jwtInfo}
        trigger={
          <li>
            <Icon name="user circle" size="big" />
          </li>
        }
        onOpen={() => putJwtInfo()}
        wide
      />,
    ];
  };

  let expireString = "";
  if (tokenExpiryTimestamp != 0) {
    const now = Math.round(Date.now() / 1000);
    const secondsUntilExpiry = tokenExpiryTimestamp - now;
    if (secondsUntilExpiry < 1) {
      expireString = "Your session has expired and you will now be logged out";
    } else {
      expireString = `Your session will time out in (less than) ${Math.floor(secondsUntilExpiry / 60)} minutes, after this you will be logged out`;
    }
  }

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
