import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import { importInterfaces } from "../api/deviceApi";

type ImportInterfaceModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly hostname: string;
  readonly getInterfaceData?: () => Promise<void> | void;
};

type ImportedFile = { interfaces: unknown } & Record<string, unknown>;

export function ImportInterfaceModal({
  hostname,
  open,
  onClose,
  getInterfaceData,
}: ImportInterfaceModalProps) {
  const [fileContent, setFileContent] = useState<ImportedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { token } = useAuthToken();
  const navigate = useNavigate();

  async function handleUpload() {
    const fileInput = document.getElementById("import-file");
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
      return;
    }
    const file = fileInput.files[0];

    try {
      const content = await file.text();
      const jsonData = JSON.parse(content) as ImportedFile;
      console.log("Imported JSON data:", jsonData);
      if (!jsonData.interfaces) {
        throw new Error("Invalid format: 'interfaces' key not found");
      }
      setFileContent(jsonData);
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Error parsing JSON: ${message}`);
      setFileContent(null);
    }
  }

  const sendInterfaceData = async (): Promise<boolean> => {
    const result = await importInterfaces(hostname, fileContent, token);
    if (result.success) return true;
    console.log(result.error);
    setErrorMessage(result.error);
    return false;
  };

  return (
    <Dialog
      aria-labelledby="interface-import-dialog"
      aria-describedby="interface-import-dialog-description"
      open={open}
      onClose={onClose}
    >
      <DialogTitle id="interface-import-dialog">
        Import Interface Configuration for {hostname}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          id="interface-import-dialog-description"
          component="div"
        >
          <p>Select a JSON file with interface configuration to import: </p>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={() => {
              void handleUpload();
            }}
          />
          {errorMessage !== null ? (
            <Alert severity="error">{errorMessage}</Alert>
          ) : (
            ""
          )}
          <pre>
            {fileContent !== null ? JSON.stringify(fileContent, null, 2) : ""}
          </pre>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          key="close"
          variant="outlined"
          color="inherit"
          onClick={() => {
            onClose();
          }}
        >
          Close
        </Button>
        <Button
          key="import"
          variant="contained"
          disabled={fileContent === null || errorMessage !== null}
          onClick={async () => {
            const success = await sendInterfaceData();
            if (success) {
              await getInterfaceData?.();
              onClose();
            }
            setFileContent(null);
          }}
        >
          Save and edit
        </Button>
        <Button
          key="import-commit"
          variant="contained"
          color="success"
          disabled={fileContent === null || errorMessage !== null}
          onClick={async () => {
            const success = await sendInterfaceData();
            if (success) {
              void navigate(
                `/config-change?hostname=${hostname}&scrollTo=refreshrepo`,
              );
            }
            setFileContent(null);
          }}
        >
          Save and dry run...
        </Button>
      </DialogActions>
    </Dialog>
  );
}
