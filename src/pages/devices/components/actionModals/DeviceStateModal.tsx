import { useState } from "react";
import { Modal, Loader } from "semantic-ui-react";
import Button from "@mui/material/Button";
import CancelIcon from "@mui/icons-material/Cancel";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { DeviceState } from "../../../../types/device";
import { updateDevice } from "../../api/deviceListApi";
import { extractErrorMessage } from "../../../../utils/extractErrorMessage";

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
    <Modal onClose={handleClose} open={isOpen}>
      <Modal.Header>Device state needs to change</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <p key="confirm">
            To perform this action, the device state needs to be changed first.
            Are you sure you want to change the state of device {hostname} to{" "}
            {newState}?
          </p>
          {isLoading && <Loader className="modalloader" />}
          <p>
            {error && (
              <>
                <CancelIcon sx={{ color: "error.main" }} />
                <label>{error}</label>
              </>
            )}
          </p>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
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
          onClick={() => {
            if (deviceId != null && newState) {
              putState(deviceId, newState);
            }
          }}
        >
          Change state
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
