import { useState } from "react";
import { Button, Modal, Loader, Icon } from "semantic-ui-react";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";
import type { DeviceState } from "../../../../types/device";
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
      const data = await updateDevice(
        id,
        { state, synchronized: false },
        token,
      );
      if (data.status !== "success") {
        const backendError = data.error || "Unknown error.";
        setError(`Error when updating state: ${backendError}`);
        return;
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
                <Icon name="delete" color="red" />
                <label>{error}</label>
              </>
            )}
          </p>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button key="cancel" color="black" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          key="submit"
          onClick={() => {
            if (deviceId != null && newState) {
              putState(deviceId, newState);
            }
          }}
          icon
          positive
          labelPosition="right"
        >
          Change state
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
