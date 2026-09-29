import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { alpha } from "@mui/material/styles";
import { useState } from "react";

import { useSecondsUntilExpiry } from "../../hooks/useSecondsUntilExpiry";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { secondsToText } from "../../utils/formatters";

type ReloginModalProps = {
  readonly isOpen?: boolean;
};

function ReloginModal({ isOpen }: ReloginModalProps) {
  const { logout, oidcLogin, tokenExpiry } = useAuthToken();

  const [closedByUser, setClosedByUser] = useState(!isOpen);
  const [prevIsOpen, setPrevIsOpen] = useState(!!isOpen);
  const secondsUntilExpiry = useSecondsUntilExpiry(tokenExpiry);

  // Reset closedByUser when isOpen changes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(!!isOpen);
    setClosedByUser(!isOpen);
  }

  const relogin = () => {
    logout();
    oidcLogin();
  };

  return (
    <Dialog
      aria-labelledby="relogin-dialog"
      aria-describedby="relogin-dialog-description"
      onClose={() => setClosedByUser(true)}
      open={!closedByUser && !!isOpen}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (theme) => alpha(theme.palette.grey[800], 0.6),
          },
        },
        paper: {
          sx: { bgcolor: "primary.main", color: "primary.contrastText" },
        },
      }}
    >
      <DialogTitle id="relogin-dialog" align="center" sx={{ color: "inherit" }}>
        <AccessTimeIcon
          sx={{ fontSize: "2em", display: "block", mx: "auto" }}
        />
        Session timeout
        <IconButton
          aria-label="Close"
          onClick={() => setClosedByUser(true)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "inherit",
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          id="relogin-dialog-description"
          align="center"
          sx={{ color: "inherit" }}
        >
          {secondsUntilExpiry === null && `Your session does not expire.`}
          {secondsUntilExpiry !== null &&
            secondsUntilExpiry <= 0 &&
            `Your session has expired.`}
          {secondsUntilExpiry !== null &&
            secondsUntilExpiry > 0 &&
            `Your session will time out in ${secondsToText(secondsUntilExpiry)}, after this you will be logged out.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center" }}>
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
      </DialogActions>
    </Dialog>
  );
}

export default ReloginModal;
