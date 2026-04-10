import { useState } from "react";
import { Button, Modal, Loader, Icon } from "semantic-ui-react";
import PropTypes from "prop-types";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { putData } from "../../../utils/sendData";

DeviceStateModal.propTypes = {
  closeAction: PropTypes.func,
  deviceId: PropTypes.number,
  hostname: PropTypes.string,
  newState: PropTypes.string,
  isOpen: PropTypes.bool,
  onStateChange: PropTypes.func,
};

export function DeviceStateModal({
  isOpen,
  closeAction,
  deviceId,
  hostname,
  newState,
  onStateChange,
}) {
  const { token } = useAuthToken();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setIsLoading(false);
    setError("");
    closeAction();
  };

  const putState = async (deviceId, state) => {
    setIsLoading(true);
    setError("");

    const url = `${process.env.API_URL}/api/v1.0/device/${deviceId}`;
    const dataToSend = {
      state,
      synchronized: false,
    };
    try {
      const data = await putData(url, token, dataToSend);
      if (data.status !== "success") {
        setError("error when updating state:" + data.error);
        return;
      }
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      onStateChange();
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={handleClose} open={isOpen}>
      <Modal.Header>Device state need to change</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <p key="confirm">
            To perform this action the device state need to be changed first.
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
          onClick={() => putState(deviceId, newState)}
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
