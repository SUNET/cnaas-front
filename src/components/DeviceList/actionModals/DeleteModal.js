import { useState } from "react";
import { Button, Checkbox, Input, Loader, Modal } from "semantic-ui-react";
import PropTypes from "prop-types";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { deleteData } from "../../../utils/sendData";

DeleteModal.propTypes = {
  addDeviceJob: PropTypes.func,
  closeAction: PropTypes.func,
  device: PropTypes.object,
  isOpen: PropTypes.bool,
};

export function DeleteModal({ addDeviceJob, closeAction, device, isOpen }) {
  const { token } = useAuthToken();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [factoryDefault, setFactoryDefault] = useState(
    device?.state === "MANAGED" && device?.device_type === "ACCESS",
  );

  // Early return if no device
  if (!device) {
    return null;
  }

  const isConfirmValid = device.hostname === confirmName;
  const canFactoryDefault =
    device.state == "MANAGED" && device.device_type == "ACCESS";

  const deleteDevice = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${device.id}`;
      const dataToSend = {
        factory_default: factoryDefault,
      };
      const data = await deleteData(url, token, dataToSend);
      if (typeof data?.job_id === "number") {
        addDeviceJob(device.id, data.job_id);
      }
      handleClose();
    } catch (error) {
      console.log(error);
      if (typeof error.json === "function") {
        try {
          const jsonError = await error.json();
          console.log(jsonError);
          setErrorMessage(`JSON error from API: ${jsonError.message}`);
        } catch (err) {
          console.log(err.statusText);
          setErrorMessage(`Error from API: ${error.statusText}`);
        }
      } else {
        console.log(error);
        setErrorMessage(`Fetch error: ${error}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsLoading(false);
    setErrorMessage("");
    setConfirmName("");
    closeAction();
  };

  return (
    <Modal onClose={handleClose} open={isOpen}>
      <Modal.Header>Delete device {device.hostname}</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <p key="confirm">
            Are you sure you want to delete device {device.hostname} with device
            ID {device.id}? Confirm hostname below to delete
          </p>
          <Input
            placeholder="confirm hostname"
            onChange={(e) => setConfirmName(e.target.value)}
          />
          <Checkbox
            label="Reset device to factory default settings when deleting"
            name="factory_default"
            checked={factoryDefault}
            disabled={!canFactoryDefault}
            onChange={(_e, data) => setFactoryDefault(data.checked)}
          />
          {isLoading && <Loader className="modalloader" />}
          {errorMessage && <p>Error deleting device: {errorMessage}</p>}
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button key="cancel" color="black" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          key="submit"
          disabled={!isConfirmValid || isLoading}
          onClick={deleteDevice}
          icon
          labelPosition="right"
          negative
        >
          Delete
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
