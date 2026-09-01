import { useState } from "react";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import StarIcon from "@mui/icons-material/Star";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { extractErrorMessageAsync } from "../../utils/extractErrorMessage";
import {
  copyFirmware,
  deleteFirmware,
  setDefaultFirmware,
} from "./firmwareCopyApi";
import { useFirmwareCopyJob } from "./useFirmwareCopyJob";

// Single-column grid stacks the firmware action buttons with a consistent gap.
const ButtonStack = styled("div")({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  justifyContent: "start",
  alignItems: "center",
});

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

  useFirmwareCopyJob(copyJobId, () => {
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
        `Error when copying firmware: ${await extractErrorMessageAsync(err)}`,
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
        `Error when deleting firmware: ${await extractErrorMessageAsync(err)}`,
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
        `Error when setting default firmware: ${await extractErrorMessageAsync(err)}`,
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
          <ButtonStack>
            <Button
              variant="contained"
              disabled={removeDisabled}
              onClick={submitDelete}
              endIcon={<DeleteOutlinedIcon />}
            >
              Delete
            </Button>
            {!linkedTo && (
              <Button
                variant="contained"
                onClick={submitSetDefault}
                endIcon={<StarIcon />}
              >
                Set as default
              </Button>
            )}
          </ButtonStack>
        )}
      </>
    );
  }

  return (
    <>
      {errorMessage && <p>{errorMessage}</p>}
      <ButtonStack>
        <Button
          variant="contained"
          disabled={copyJobId !== null || !sha1sum}
          onClick={submitCopy}
          endIcon={<CloudDownloadIcon />}
        >
          Copy to NMS
        </Button>
      </ButtonStack>
      {copyJobStatus !== null && (
        <p>
          Copy job id #{copyJobId} status: {copyJobStatus}
        </p>
      )}
    </>
  );
}
