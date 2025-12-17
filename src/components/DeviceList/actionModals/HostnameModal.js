import { useState } from "react";
import { Button, Modal, Input, Loader } from "semantic-ui-react";
import PropTypes from "prop-types";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { putData } from "../../../utils/sendData";

HostnameModal.propTypes = {
  deviceId: PropTypes.number,
  hostname: PropTypes.string,
};

export function HostnameModal({ deviceId, hostname, isOpen, closeAction }) {
  const { token } = useAuthToken();
  const [newHostname, setNewHostname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const putHostname = async () => {
    setIsLoading(true);

    const url = `${process.env.API_URL}/api/v1.0/device/${deviceId}`;
    const dataToSend = { hostname: newHostname };
    try {
      const data = await putData(url, token, dataToSend);

      if (data.status !== "success") {
        setError(data.error);
      }
    } catch (err) {
      setError(err);
    }
    setIsLoading(false);
  };

  return (
    <Modal onClose={closeAction} open={isOpen}>
      <Modal.Header>Change hostname for {hostname}</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          Type the new hostname:
          <Input
            type="text"
            placeholder="new hostname..."
            action
            onChange={(e) => setNewHostname(e.target.value)}
            value={newHostname}
          />
          {isLoading && <Loader />}
          {error && <p> {error} </p>}
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
            closeAction();
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
