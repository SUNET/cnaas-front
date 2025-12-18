import { useState } from "react";
import { Button, Modal, Input, Loader, Icon } from "semantic-ui-react";
import PropTypes from "prop-types";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { putData } from "../../../utils/sendData";

HostnameModal.propTypes = {
  deviceId: PropTypes.number,
  hostname: PropTypes.string,
  isOpen: PropTypes.bool,
  closeAction: PropTypes.func,
};

export function HostnameModal({ deviceId, hostname, isOpen, closeAction }) {
  const { token } = useAuthToken();
  const [newHostname, setNewHostname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const putHostname = async () => {
    setIsLoading(true);
    setError("");
    setSuccess(false);

    const url = `${process.env.API_URL}/api/v1.0/device/${deviceId}`;
    const dataToSend = { hostname: newHostname };
    try {
      const data = await putData(url, token, dataToSend);

      if (data.status !== "success") {
        setSuccess(false);
        setError(data.error);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
      setSuccess(false);
    }
    setIsLoading(false);
  };

  return (
    <Modal onClose={closeAction} open={isOpen}>
      <Modal.Header>Change hostname for {hostname}</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          Type the new hostname:{" "}
          <Input
            type="text"
            placeholder="new hostname..."
            onChange={(e) => setNewHostname(e.target.value)}
            value={newHostname}
            fluid
          />
          {isLoading && <Loader active inline />}
          {!isLoading && <Loader active inline />}
          {error && <p> {error} </p>}
          <p>
            {success && (
              <>
                <Icon name="check" color="green" />
                <label>Hostname changed</label>
              </>
            )}
          </p>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button key="cancel" color="black" onClick={closeAction}>
          Cancel
        </Button>
        <Button
          key="submit"
          onClick={() => {
            putHostname();
          }}
          icon
          positive
          labelPosition="right"
        >
          Change hostname
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
