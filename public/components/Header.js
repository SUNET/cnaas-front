import React from "react";
import { NavLink } from "react-router-dom";
import { Popup, Loader, Button, Modal, Header as SemanticHeader, ModalContent, ModalActions, Icon } from "semantic-ui-react";
import { jwtDecode } from "jwt-decode";

class Header extends React.Component {
  state = {
    jwtInfo: [<Loader key="loading" inline active />],
    reloginModalOpen: true
  };

  tokenExpireTimer = null;

  getJwtInfo = () => {
    const credentials = localStorage.getItem("token");
    var decoded_token = jwtDecode(credentials);
    console.log(decoded_token.exp);

    var now = Math.round(Date.now() / 1000);
    var secondsUntilExpiry = decoded_token.exp - now;

    return secondsUntilExpiry;
  }
  
  putJwtInfo = (secondsUntilExpiry) => {
    var secondsUntilExpiry = this.getJwtInfo();

    var expiryString = "";
    if (secondsUntilExpiry < 0) {
      expiryString = `Token exired ${(Math.round(Math.abs(secondsUntilExpiry) / 60))} minutes ago`;
    } else {
      expiryString = `Token valid for ${Math.round(Math.abs(secondsUntilExpiry) / 60)} more minutes`;
    }

    this.setState({
      jwtInfo: [<p key="exp">{expiryString}</p>,<p key="copyjwt"><Button onClick={() => navigator.clipboard.writeText(credentials)}>Copy JWT</Button></p>]
    });
  }

  renderLinks = () => {
    if (localStorage.getItem("token") !== null) {
      var secondsUntilExpiry = this.getJwtInfo();
      if (this.tokenExpireTimer === null) {
        this.tokenExpireTimer = setTimeout(() => {
          this.setState({reloginModalOpen: true});
        }, secondsUntilExpiry);
      }
      return [
        <NavLink exact activeClassName="active" to={`/dashboard`} key="nav1">
          <li>Dashboard</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/devices`} key="nav2">
          <li>Devices</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/groups`} key="nav3">
          <li>Groups</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/jobs`} key="nav4">
          <li>Jobs</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/firmware-copy`} key="nav5">
          <li>Firmware</li>
        </NavLink>,
        <NavLink exact activeClassName="active" to={`/config-change`} key="nav6">
          <li>Config change</li>
        </NavLink>,
        <Popup
          key="profile"
          hoverable={true}
          content={this.state.jwtInfo}
          trigger={<li>Profile</li>}
          onOpen={() => this.putJwtInfo()}
          />
      ];
    } else {
      return [
            <NavLink exact activeClassName="active" to={`/`}>
              <li key="nav1">Login</li>
            </NavLink>
      ];
    }
  }

  render() {
    return (
      <header>
        <nav>
          <h1>CNaaS NMS: {process.env.API_URL.split("/")[2]}</h1>
          <ul>
            {this.renderLinks()}
          </ul>
          <Modal
            basic
            closeIcon={true}
            onClose={() => this.setState({reloginModalOpen: false})}
            open={this.state.reloginModalOpen}
            size='small'
          >
            <SemanticHeader icon>
              <Icon name='time' />
              Session timeout
            </SemanticHeader>
            <ModalContent>
              <p>
                Your session will time out in less than 5 minutes, after this you will be logged out
              </p>
            </ModalContent>
            <ModalActions>
              <Button color='red' inverted>
                <Icon name='sign-out' /> Log out
              </Button>
              <Button color='green' inverted>
                <Icon name='refresh' /> Log in again
              </Button>
            </ModalActions>
          </Modal>
        </nav>
      </header>
    );
  }
}

export default Header;
