import React from "react";
import { NavLink } from "react-router-dom";
import {
  Popup,
  Loader,
  Button,
  Modal,
  Header as SemanticHeader,
  ModalContent,
  ModalActions,
  Icon,
} from "semantic-ui-react";
import { jwtDecode } from "jwt-decode";
import permissionsCheck from "../utils/permissions/permissionsCheck";
import { postData } from "../utils/sendData";

class Header extends React.Component {
  state = {
    jwtInfo: [<Loader key="loading" inline active />],
    reloginModalOpen: false,
  };

  tokenExpireTimer = null;

  tokenExpiryTimestamp = 0;

  triggerTokenRefresh = false;

  getJwtInfo = () => {
    try {
      const credentials = localStorage.getItem("token");
      const decoded_token = jwtDecode(credentials);

      const now = Math.round(Date.now() / 1000);
      const secondsUntilExpiry = decoded_token.exp - now;
      this.tokenExpiryTimestamp = decoded_token.exp;

      return secondsUntilExpiry;
    } catch {
      this.tokenExpiryTimestamp = -1;
      return -1;
    }
  };

  refreshNow = () => {
    window.clearTimeout(this.tokenExpireTimer);
    this.tokenExpireTimer = null;
    this.triggerTokenRefresh = true;
    this.setState({ jwtInfo: [<Loader key="loading" inline active />] });
  };

  putJwtInfo = () => {
    const secondsUntilExpiry = this.getJwtInfo();

    let expiryString = "";
    if (secondsUntilExpiry < 0) {
      expiryString = `Token exired ${Math.round(Math.abs(secondsUntilExpiry) / 60)} minutes ago`;
    } else {
      expiryString = `Token valid for ${Math.round(Math.abs(secondsUntilExpiry) / 60)} more minutes`;
    }

    const username = localStorage.getItem("username");
    let userinfo = "";
    if (username !== null) {
      userinfo = `Logged in as ${username}`;
    } else {
      userinfo = "Unknown user (username attribute missing)";
    }
    const credentials = localStorage.getItem("token");

    this.setState({
      jwtInfo: [
        <p key="userinfo">{userinfo}</p>,
        <p key="exp" className={secondsUntilExpiry < 0 ? "tokenexpired" : ""}>
          {expiryString}
        </p>,
        <p key="jwtcopyrefresh">
          <Popup
            content="Copy JWT (to use from curl etc), take note of valid time listed above"
            trigger={
              <Button
                onClick={() => navigator.clipboard.writeText(credentials)}
                icon="copy"
                size="tiny"
              />
            }
            position="bottom right"
          />
          <Popup
            content="Try to refresh the access token now, if it can't be refresh automatically you will be asked to log in again"
            trigger={
              <Button onClick={this.refreshNow} icon="refresh" size="tiny" />
            }
            position="bottom right"
          />
        </p>,
        <p key="logout">
          <Button onClick={this.logout}>Log out</Button>
        </p>,
      ],
    });
  };

  logout = () => {
    localStorage.removeItem("token");
    window.location.replace("/");
  };

  relogin = () => {
    localStorage.removeItem("token");
    const url = `${process.env.API_URL}/api/v1.0/auth/login`;
    window.location.replace(url);
  };

  renderLinks = () => {
    if (localStorage.getItem("token") !== null) {
      if (
        this.tokenExpireTimer === null &&
        process.env.OIDC_ENABLED == "true"
      ) {
        let secondsUntilExpiry = null;
        if (this.triggerTokenRefresh === true) {
          secondsUntilExpiry = 0;
        } else {
          secondsUntilExpiry = this.getJwtInfo();
        }
        this.tokenExpireTimer = setTimeout(
          () => {
            // try to refresh token silently first
            const url = `${process.env.API_URL}/api/v1.0/auth/refresh`;
            const credentials = localStorage.getItem("token");
            postData(url, credentials, {})
              .then((data) => {
                localStorage.setItem("token", data.data.access_token);
                const oldExpiry = this.tokenExpiryTimestamp;
                this.getJwtInfo();
                if (oldExpiry == this.tokenExpiryTimestamp) {
                  console.log(
                    "Refresh of access token failed, session will time out",
                  );
                  this.setState({ reloginModalOpen: true });
                } else {
                  window.clearTimeout(this.tokenExpireTimer);
                  this.tokenExpireTimer = null;
                  if (this.triggerTokenRefresh === true) {
                    this.triggerTokenRefresh = false;
                    this.putJwtInfo();
                  } else {
                    // trigger refresh of profile info, unless refreshNow already triggered it
                    this.setState({
                      jwtInfo: [<Loader key="loading" inline active />],
                    });
                  }
                }
              })
              .catch((error) => {
                console.log(
                  "Refresh of access token failed, session will time out",
                );
                console.log(error);
                this.setState({ reloginModalOpen: true });
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
          content={this.state.jwtInfo}
          trigger={
            <li>
              <Icon name="user circle" size="big" />
            </li>
          }
          onOpen={() => this.putJwtInfo()}
          wide
        />,
      ];
    }
    return [
      <NavLink exact activeClassName="active" to="/" key="navlogin">
        <li key="nav1">Login</li>
      </NavLink>,
    ];
  };

  render() {
    let expireString = "";
    if (this.tokenExpiryTimestamp != 0) {
      const now = Math.round(Date.now() / 1000);
      const secondsUntilExpiry = this.tokenExpiryTimestamp - now;
      if (secondsUntilExpiry < 1) {
        expireString =
          "Your session has expired and you will now be logged out";
      } else {
        expireString = `Your session will time out in (less than) ${Math.floor(secondsUntilExpiry / 60)} minutes, after this you will be logged out`;
      }
    }

    return (
      <header>
        <nav>
          <h1>CNaaS NMS: {process.env.API_URL.split("/")[2]}</h1>
          <ul>{this.renderLinks()}</ul>
          <Modal
            basic
            closeIcon
            onClose={() => this.setState({ reloginModalOpen: false })}
            open={this.state.reloginModalOpen}
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
              <Button color="red" inverted onClick={this.logout}>
                <Icon name="sign-out" /> Log out
              </Button>
              <Button color="green" inverted onClick={this.relogin}>
                <Icon name="refresh" /> Log in again
              </Button>
            </ModalActions>
          </Modal>
        </nav>
      </header>
    );
  }
}

export default Header;
