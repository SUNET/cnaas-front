import PropTypes from "prop-types";
import { Modal, Button } from "semantic-ui-react";
import { useState } from "react";
import { putData } from "../../utils/sendData";
import { useAuthToken } from "../../contexts/AuthTokenContext";

export function ImportInterfaceModal({
  hostname,
  open,
  onClose,
  getInterfaceData,
  history,
}) {
  const [fileContent, setFileContent] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const { token } = useAuthToken();

  function handleUpload() {
    const fileInput = document.getElementById("import-file");
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const content = e.target.result;
      try {
        const jsonData = JSON.parse(content);
        console.log("Imported JSON data:", jsonData);
        if (!jsonData.interfaces) {
          throw new Error("Invalid format: 'interfaces' key not found");
        }
        setFileContent(jsonData);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(`Error parsing JSON: ${error.message}`);
        setFileContent(null);
      }
    };

    reader.readAsText(file);
  }

  const sendInterfaceData = async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
      const data = await putData(url, token, fileContent);

      if (data.status === "success") {
        return true;
      } else {
        console.log(data.message);
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.log(error);
      setErrorMessage(error?.message?.errors?.join(", "));
    }

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
              getInterfaceData();
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
              history.push(
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

ImportInterfaceModal.propTypes = {
  hostname: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  getInterfaceData: PropTypes.func,
  history: PropTypes.object,
};
