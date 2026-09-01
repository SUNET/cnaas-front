import { useState } from "react";
import { Modal, ModalActions, ModalContent } from "semantic-ui-react";
import Button from "@mui/material/Button";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
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
      <div style={{ textAlign: "center", padding: "var(--size-md)" }}>
        <AccessTimeIcon
          sx={{ fontSize: "2em", display: "block", mx: "auto" }}
        />
        <h2>Session timeout</h2>
      </div>
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
        <Button
          variant="contained"
          color="error"
          onClick={logout}
          startIcon={<LogoutIcon />}
        >
          Log out
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={relogin}
          startIcon={<RefreshIcon />}
        >
          Log in again
        </Button>
      </ModalActions>
    </Modal>
  );
}

export default ReloginModal;
