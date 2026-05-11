import { useState } from "react";
import {
  Button,
  Checkbox,
  type CheckboxProps,
  Input,
  Loader,
  Modal,
} from "semantic-ui-react";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";
import { deleteDevice } from "../../api/deviceListApi";
import type { Device } from "../../../../types/device";
import { isAccessDevice, isManaged } from "../../../../types/device";

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
      if (typeof data?.job_id === "number") {
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
            onChange={(_e: unknown, data: CheckboxProps) =>
              setFactoryDefault(Boolean(data.checked))
            }
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
          onClick={handleDelete}
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
