import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { useState } from "react";

import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { DeviceState } from "../../../../types/device";
import { extractErrorMessage } from "../../../../utils/extractErrorMessage";
import { updateDevice } from "../../api/deviceListApi";

type DeviceStateModalProps = {
  readonly isOpen: boolean;
  readonly closeAction: () => void;
  readonly deviceId?: number | null;
  readonly hostname?: string | null;
  readonly newState?: DeviceState | null;
  readonly onStateChange: () => void;
};

export function DeviceStateModal({
  isOpen,
  closeAction,
  deviceId,
  hostname,
  newState,
  onStateChange,
}: DeviceStateModalProps) {
  const { token } = useAuthToken();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setIsLoading(false);
    setError("");
    closeAction();
  };

  const putState = async (id: number, state: DeviceState) => {
    setIsLoading(true);
    setError("");

    try {
      await updateDevice(id, { state, synchronized: false }, token);
      handleClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      onStateChange();
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      aria-labelledby="device-state-dialog"
      aria-describedby="device-state-dialog-description"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogTitle id="device-state-dialog">
        Device state needs to change
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id="device-state-dialog-description">
            To perform this action, the device state needs to be changed first.
            Are you sure you want to change the state of device {hostname} to{" "}
            {newState}?
          </DialogContentText>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          key="cancel"
          variant="outlined"
          color="inherit"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          key="submit"
          variant="contained"
          color="success"
          disabled={isLoading}
          loading={isLoading}
          onClick={() => {
            if (deviceId != null && newState) {
              putState(deviceId, newState);
            }
          }}
        >
          Change state
        </Button>
      </DialogActions>
    </Dialog>
  );
}
