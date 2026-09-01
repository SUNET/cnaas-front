import { useState } from "react";
import { Modal, Input } from "semantic-ui-react";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/Check";
import { useNavigate } from "react-router";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import { updateDevice } from "../../api/deviceListApi";
import { extractErrorMessage } from "../../../../utils/extractErrorMessage";

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
          <Paper variant="outlined" sx={{ padding: "var(--size-md)" }}>
            Type the new hostname:{" "}
            <Input
              type="text"
              placeholder="new hostname..."
              onChange={(e) => setNewHostname(e.target.value)}
              value={newHostname}
              fluid
            />
            {isLoading && <CircularProgress />}
            <p>
              {error && (
                <>
                  <CancelIcon sx={{ color: "error.main" }} />
                  <label>{error}</label>
                </>
              )}
              {success && (
                <>
                  <CheckIcon sx={{ color: "success.main" }} />
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label>Hostname changed</label>
                </>
              )}
            </p>
          </Paper>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        {!success && (
          <>
            <Button
              key="cancel"
              variant="outlined"
              color="inherit"
              onClick={closeAction}
            >
              Cancel
            </Button>
            <Button
              key={`hostname-${hostname}-submit-btn`}
              variant="contained"
              color="success"
              disabled={!isNewHostnameValid || isLoading}
              onClick={putHostname}
              loading={isLoading}
            >
              Change hostname
            </Button>
          </>
        )}
        {success && (
          <Button
            key={`hostname-${hostname}-sync-button`}
            variant="contained"
            onClick={() => navigate(`/config-change?scrollTo=dry_run`)}
          >
            Sync devices...
          </Button>
        )}
      </Modal.Actions>
    </Modal>
  );
}
