import React from "react";
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
} from "../../contexts/AuthTokenContext";

function ReloginModal({ isOpen }) {
  const { logout, oidcLogin, token } = useAuthToken();

  const relogin = () => {
    logout();
    oidcLogin();
  };

  const secondsUntilExpiry = getSecondsUntilExpiry(token);

  return (
    <Modal basic open={isOpen} size="small">
      <SemanticHeader icon>
        <Icon name="time" />
        Session timeout
      </SemanticHeader>
      <ModalContent>
        <p>
          {secondsUntilExpiry === 0
            ? "Your session has expired and you will now be logged out"
            : `Your session will time out in (less than) ${Math.floor(secondsUntilExpiry / 60)} minutes, after this you will be logged out`}
        </p>
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
  );
}

export default ReloginModal;
