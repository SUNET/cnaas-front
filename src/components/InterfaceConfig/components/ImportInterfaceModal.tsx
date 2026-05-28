import { Modal, Button } from "semantic-ui-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { importInterfaces } from "../api/deviceApi";
import { useAuthToken } from "../../../contexts/AuthTokenContext";

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
    <Modal open={open} onClose={onClose}>
      <Modal.Header>Import Interface Configuration for {hostname}</Modal.Header>
      <Modal.Content scrolling>
        <Modal.Description>
          <p>Select a JSON file with interface configuration to import: </p>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={() => {
              handleUpload();
            }}
          />
          {errorMessage !== null ? (
            <p>
              <span style={{ color: "red" }}>{errorMessage}</span>
            </p>
          ) : (
            ""
          )}
          <pre>
            {fileContent !== null ? JSON.stringify(fileContent, null, 2) : ""}
          </pre>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button
          key="close"
          color="black"
          onClick={() => {
            onClose();
          }}
        >
          Close
        </Button>
        <Button
          key="import"
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
          positive
          disabled={fileContent === null || errorMessage !== null}
          onClick={async () => {
            const success = await sendInterfaceData();
            if (success) {
              navigate(
                `/config-change?hostname=${hostname}&scrollTo=refreshrepo`,
              );
            }
            setFileContent(null);
          }}
        >
          Save and dry run...
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
