import { useState } from "react";
import { Button, Modal, Input, Loader, Icon, Segment } from "semantic-ui-react";
import PropTypes from "prop-types";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { putData } from "../../../utils/sendData";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

HostnameModal.propTypes = {
  closeAction: PropTypes.func,
  deviceId: PropTypes.number,
  hostname: PropTypes.string,
  isOpen: PropTypes.bool,
  onSuccess: PropTypes.func,
};

export function HostnameModal({
  closeAction,
  deviceId,
  hostname,
  isOpen,
  onSuccess,
}) {
  const { token } = useAuthToken();
  const history = useHistory();
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

      if (data.status === "success") {
        handleSuccess();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
      setSuccess(false);
    }
    setIsLoading(false);
  };

  const handleSuccess = () => {
    setSuccess(true);
    onSuccess(hostname, newHostname);
  };

  const handleClose = () => {
    setNewHostname("");
    setIsLoading(false);
    setSuccess(false);
    setError("");
    closeAction();
  };

  const isNewHostnameValid = newHostname && newHostname !== hostname;

  return (
    <Modal onClose={handleClose} open={isOpen}>
      <Modal.Header>Change hostname for {hostname}</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <Segment>
            Type the new hostname:{" "}
            <Input
              type="text"
              placeholder="new hostname..."
              onChange={(e) => setNewHostname(e.target.value)}
              value={newHostname}
              fluid
            />
            {isLoading && <Loader className="modalloader" />}
            <p>
              {error && (
                <>
                  <Icon name="delete" color="red" />
                  <label>{error}</label>
                </>
              )}
              {success && (
                <>
                  <Icon name="check" color="green" />
                  <label>Hostname changed</label>
                </>
              )}
            </p>
          </Segment>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        {!success && (
          <>
            <Button key="cancel" color="black" onClick={closeAction}>
              Cancel
            </Button>
            <Button
              key={"hostname-${hostname}-submit-btn"}
              disabled={!isNewHostnameValid || isLoading}
              onClick={putHostname}
              loading={isLoading}
              icon
              positive
              labelPosition="right"
            >
              Change hostname
            </Button>
          </>
        )}
        {success && (
          <Button
            key={"hostname-${hostname}-sync-button"}
            onClick={() => history.push(`/config-change?scrollTo=dry_run`)}
            labelPosition="right"
          >
            Sync devices...
          </Button>
        )}
      </Modal.Actions>
    </Modal>
  );
}
