import { useState } from "react";
import {
  Button,
  Icon,
  Modal,
  ModalActions,
  ModalContent,
  Header as SemanticHeader,
} from "semantic-ui-react";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { useSecondsUntilExpiry } from "../../hooks/useSecondsUntilExpiry";
import { secondsToText } from "../../utils/formatters";

type ReloginModalProps = {
  readonly isOpen?: boolean;
};

function ReloginModal({ isOpen }: ReloginModalProps) {
  const { logout, oidcLogin, tokenExpiry } = useAuthToken();

  const [closedByUser, setClosedByUser] = useState(!isOpen);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const secondsUntilExpiry = useSecondsUntilExpiry(tokenExpiry);

  // Reset closedByUser when isOpen changes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setClosedByUser(!isOpen);
  }

  const relogin = () => {
    logout();
    oidcLogin();
  };

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
