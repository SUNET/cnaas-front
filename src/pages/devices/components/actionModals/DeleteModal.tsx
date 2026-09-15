import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";

import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { Device } from "../../../../types/device";
import { isAccessDevice, isManaged } from "../../../../types/device";
import { deleteDevice } from "../../api/deviceListApi";

type DeleteModalProps = {
  readonly addDeviceJob: (deviceId: number, jobId: number) => void;
  readonly closeAction: () => void;
  readonly device: Device | null;
  readonly isOpen: boolean;
};

type ApiErrorWithJson = {
  readonly json: () => Promise<{ message?: string }>;
  readonly statusText?: string;
};

function hasJsonMethod(error: unknown): error is ApiErrorWithJson {
  return (
    typeof error === "object" &&
    error !== null &&
    "json" in error &&
    typeof error.json === "function"
  );
}

export function DeleteModal({
  addDeviceJob,
  closeAction,
  device,
  isOpen,
}: DeleteModalProps) {
  const { token } = useAuthToken();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [factoryDefault, setFactoryDefault] = useState(
    device != null && isManaged(device) && isAccessDevice(device),
  );

  // Early return if no device
  if (!device) {
    return null;
  }

  const isConfirmValid = device.hostname === confirmName;
  const canFactoryDefault = isManaged(device) && isAccessDevice(device);

  const handleClose = () => {
    setIsLoading(false);
    setErrorMessage("");
    setConfirmName("");
    closeAction();
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await deleteDevice(
        device.id,
        { factory_default: factoryDefault },
        token,
      );
      if ("job_id" in data) {
        addDeviceJob(device.id, data.job_id);
      }
      handleClose();
    } catch (error) {
      if (hasJsonMethod(error)) {
        try {
          const jsonError = await error.json();
          setErrorMessage(`JSON error from API: ${jsonError.message}`);
        } catch {
          setErrorMessage(`Error from API: ${error.statusText ?? "unknown"}`);
        }
      } else {
        setErrorMessage(
          `Fetch error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      aria-labelledby="delete-dialog"
      aria-describedby="delete-dialog-description"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogTitle id="delete-dialog">
        Delete device {device.hostname}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete device {device.hostname} with device
            ID {device.id}? Confirm hostname below to delete
          </DialogContentText>
          <TextField
            disabled={isLoading}
            label="Confirm hostname"
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="confirm hostname"
            size="small"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="factory_default"
                checked={factoryDefault}
                disabled={!canFactoryDefault || isLoading}
                onChange={(e) => setFactoryDefault(e.target.checked)}
              />
            }
            label="Reset device to factory default settings when deleting"
          />
          {errorMessage && (
            <Alert severity="error">
              Error deleting device: {errorMessage}
            </Alert>
          )}
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
          color="error"
          disabled={!isConfirmValid || isLoading}
          key="submit"
          loading={isLoading}
          onClick={handleDelete}
          variant="contained"
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
