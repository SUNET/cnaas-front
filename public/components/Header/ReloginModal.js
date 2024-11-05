import React, { useEffect, useRef, useState } from "react";
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

  const [closedByUser, setClosedByUser] = useState(!isOpen);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(
    getSecondsUntilExpiry(token),
  );

  const relogin = () => {
    logout();
    oidcLogin();
  };

  const timerId = useRef();

  // Sets an interval
  useEffect(() => {
    const tokenSecsRemaining = getSecondsUntilExpiry(token);
    setSecondsUntilExpiry(tokenSecsRemaining);

    if (tokenSecsRemaining) {
      timerId.current = setInterval(() => {
        setSecondsUntilExpiry((prev) => prev - 5);
      }, 5000);
    }

    return () => {
      clearInterval(timerId.current);
    };
  }, [token]);

  useEffect(() => {
    if (secondsUntilExpiry <= 0) {
      clearInterval(timerId.current);
    }
  }, [secondsUntilExpiry]);

  useEffect(() => {
    setClosedByUser(!isOpen);
  }, [isOpen]);

  return (
    <Modal
      basic
      closeIcon
      onClose={() => setClosedByUser(true)}
      open={!closedByUser && isOpen}
      size="small"
    >
      <SemanticHeader icon>
        <Icon name="time" />
        Session timeout
      </SemanticHeader>
      <ModalContent>
        <p>
          {secondsUntilExpiry <= 0
            ? `Your session has expired.`
            : `Your session will time out in ${Math.floor(secondsUntilExpiry / 60)} minutes, after this you will be logged out.`}
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
