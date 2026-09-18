import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuthToken } from "../../../../stores/AuthTokenContext";
import { extractErrorMessage } from "../../../../utils/extractErrorMessage";
import { updateDevice } from "../../api/deviceListApi";

type HostnameModalProps = {
  readonly closeAction: () => void;
  readonly deviceId?: number | null;
  readonly hostname?: string | null;
  readonly isOpen: boolean;
  readonly onSuccess: (oldHostname: string, newHostname: string) => void;
};

export function HostnameModal({
  closeAction,
  deviceId,
  hostname,
  isOpen,
  onSuccess,
}: HostnameModalProps) {
  const { token } = useAuthToken();
  const [newHostname, setNewHostname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSuccess = () => {
    setSuccess(true);
    if (hostname) {
      onSuccess(hostname, newHostname);
    }
  };

  const putHostname = async () => {
    if (deviceId == null) return;
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      await updateDevice(deviceId, { hostname: newHostname }, token);
      handleSuccess();
    } catch (err) {
      setError(extractErrorMessage(err));
      setSuccess(false);
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setNewHostname("");
    setIsLoading(false);
    setSuccess(false);
    setError("");
    closeAction();
  };

  const isNewHostnameValid = Boolean(newHostname) && newHostname !== hostname;

  return (
    <Dialog
      aria-labelledby="change-hostname-dialog"
      aria-describedby="change-hostname-dialog-description"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogTitle id="change-hostname-dialog">
        Change hostname for {hostname}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id="change-hostname-dialog-description">
            Type the new hostname:{" "}
          </DialogContentText>
          <TextField
            disabled={isLoading}
            fullWidth
            label="New hostname"
            onChange={(e) => setNewHostname(e.target.value)}
            placeholder="Enter hostname"
            size="small"
            type="text"
            value={newHostname}
          />
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">Hostname changed</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!success && (
          <>
            <Button
              key="cancel"
              variant="outlined"
              color="inherit"
              onClick={closeAction}
            >
              Cancel
            </Button>
            <Button
              key={`hostname-${hostname}-submit-btn`}
              variant="contained"
              color="success"
              disabled={!isNewHostnameValid || isLoading}
              onClick={putHostname}
              loading={isLoading}
            >
              Change hostname
            </Button>
          </>
        )}
        {success && (
          <Button
            key={`hostname-${hostname}-sync-button`}
            variant="contained"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate(`/config-change?scrollTo=dry_run`)}
          >
            Sync devices...
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
