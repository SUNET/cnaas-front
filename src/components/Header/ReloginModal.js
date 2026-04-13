import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
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
import { secondsToText } from "../../utils/formatters";

ReloginModal.propTypes = {
  isOpen: PropTypes.bool,
};

function ReloginModal({ isOpen }) {
  const { logout, oidcLogin, tokenExpiry } = useAuthToken();

  const [closedByUser, setClosedByUser] = useState(!isOpen);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(() =>
    getSecondsUntilExpiry(tokenExpiry),
  );
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevTokenExpiry, setPrevTokenExpiry] = useState(tokenExpiry);
  const timerId = useRef();

  // Reset closedByUser when isOpen changes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setClosedByUser(!isOpen);
  }

  // Reset countdown when tokenExpiry changes (e.g. token refresh)
  if (tokenExpiry !== prevTokenExpiry) {
    setPrevTokenExpiry(tokenExpiry);
    setSecondsUntilExpiry(getSecondsUntilExpiry(tokenExpiry));
  }

  const relogin = () => {
    logout();
    oidcLogin();
  };

  useEffect(() => {
    if (tokenExpiry === null || tokenExpiry === undefined) {
      return;
    }

    if (getSecondsUntilExpiry(tokenExpiry) > 0) {
      timerId.current = setInterval(() => {
        const remaining = getSecondsUntilExpiry(tokenExpiry);
        setSecondsUntilExpiry(remaining);
        if (remaining <= 0) {
          clearInterval(timerId.current);
        }
      }, 5000);
    }

    return () => {
      clearInterval(timerId.current);
    };
  }, [tokenExpiry]);

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
          {secondsUntilExpiry === null && `Your session does not expire.`}
          {secondsUntilExpiry !== null &&
            secondsUntilExpiry <= 0 &&
            `Your session has expired.`}
          {secondsUntilExpiry !== null &&
            secondsUntilExpiry > 0 &&
            `Your session will time out in ${secondsToText(secondsUntilExpiry)}, after this you will be logged out.`}
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
