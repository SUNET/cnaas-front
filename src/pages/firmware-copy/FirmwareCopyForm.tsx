import { useState } from "react";
import { Button, ButtonGroup, Icon } from "semantic-ui-react";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { extractErrorMessage } from "../../utils/extractErrorMessage";
import {
  copyFirmware,
  deleteFirmware,
  setDefaultFirmware,
} from "./firmwareCopyApi";
import { useFirmwareCopyJob } from "./useFirmwareCopyJob";

type FirmwareCopyFormProps = {
  readonly filename: string;
  readonly sha1sum?: string;
  readonly alreadyDownloaded: boolean;
  readonly defaultFirmware?: string;
  readonly linkedTo?: string;
  readonly reloadFirmwareFiles: () => void;
};

export function FirmwareCopyForm({
  filename,
  sha1sum,
  alreadyDownloaded,
  defaultFirmware,
  linkedTo,
  reloadFirmwareFiles,
}: FirmwareCopyFormProps) {
  const [copyJobId, setCopyJobId] = useState<number | null>(null);
  const [copyJobStatus, setCopyJobStatus] = useState<string | null>(null);
  const [removeDisabled, setRemoveDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { token } = useAuthToken();

  useFirmwareCopyJob(token, copyJobId, () => {
    reloadFirmwareFiles();
    setCopyJobId(null);
    setCopyJobStatus(null);
  });

  const submitCopy = async () => {
    try {
      const jobId = await copyFirmware(filename, sha1sum, token);
      setCopyJobId(jobId);
      setCopyJobStatus("RUNNING");
    } catch (err) {
      setErrorMessage(
        `Error when copying firmware: ${extractErrorMessage(err)}`,
      );
    }
  };

  const submitDelete = async () => {
    try {
      setRemoveDisabled(true);
      await deleteFirmware(filename, token);
      reloadFirmwareFiles();
    } catch (err) {
      setErrorMessage(
        `Error when deleting firmware: ${extractErrorMessage(err)}`,
      );
    } finally {
      setRemoveDisabled(false);
    }
  };

  const submitSetDefault = async () => {
    try {
      await setDefaultFirmware(filename, token);
      reloadFirmwareFiles();
    } catch (err) {
      setErrorMessage(
        `Error when setting default firmware: ${extractErrorMessage(err)}`,
      );
    }
  };

  if (alreadyDownloaded) {
    return (
      <>
        {errorMessage && <p>{errorMessage}</p>}
        {defaultFirmware ? (
          <p>
            This firmware is a default firmware for one or more device types
            during ZTP.
          </p>
        ) : (
          <ButtonGroup vertical labeled icon>
            <Button disabled={removeDisabled} onClick={submitDelete}>
              Delete <Icon name="trash alternate outline" />
            </Button>
            {!linkedTo && (
              <Button onClick={submitSetDefault} compact>
                Set as default <Icon name="star" color="blue" />
              </Button>
            )}
          </ButtonGroup>
        )}
      </>
    );
  }

  return (
    <>
      {errorMessage && <p>{errorMessage}</p>}
      <ButtonGroup vertical labeled icon>
        <Button disabled={copyJobId !== null || !sha1sum} onClick={submitCopy}>
          Copy to NMS <Icon name="cloud download" />
        </Button>
      </ButtonGroup>
      {copyJobStatus !== null && (
        <p>
          Copy job id #{copyJobId} status: {copyJobStatus}
        </p>
      )}
    </>
  );
}
