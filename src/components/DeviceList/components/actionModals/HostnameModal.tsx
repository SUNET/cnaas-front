import { useState } from "react";
import { Button, Modal, Input, Loader, Icon, Segment } from "semantic-ui-react";
import { useNavigate } from "react-router";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";
import { updateDevice } from "../../api/deviceListApi";
import { extractErrorMessage } from "../../utils";

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
  const navigate = useNavigate();
  const [newHostname, setNewHostname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
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
              key={`hostname-${hostname}-submit-btn`}
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
            key={`hostname-${hostname}-sync-button`}
            onClick={() => navigate(`/config-change?scrollTo=dry_run`)}
            labelPosition="right"
          >
            Sync devices...
          </Button>
        )}
      </Modal.Actions>
    </Modal>
  );
}
