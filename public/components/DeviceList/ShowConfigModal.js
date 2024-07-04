import React, { useEffect, useState } from "react";
import {
  Button,
  ButtonGroup,
  Loader,
  Popup,
  Icon,
  Modal,
  ModalActions,
  ModalContent,
  ModalDescription,
  ModalHeader,
  Grid,
  GridRow,
  GridColumn,
  Segment,
} from "semantic-ui-react";
import PropTypes from "prop-types";
import { getData } from "../../utils/getData";

function ShowConfigModal({ hostname, state, isOpen, closeAction }) {
  const [runningConfig, setRunningConfig] = useState({ config: "" });
  const [generatedConfig, setGeneratedConfig] = useState({
    generated_config: "",
  });
  const [errors, setErrors] = useState([]);

  function clearForm() {
    setErrors([]);
    setRunningConfig({ config: "" });
    setGeneratedConfig({ generated_config: "" });
  }

  function handleCancel() {
    clearForm();
    closeAction();
  }

  function getRunningConfig() {
    const credentials = localStorage.getItem("token");
    setRunningConfig({ config: <Loader className="modalloader" /> });
    getData(
      `${process.env.API_URL}/api/v1.0/device/${hostname}/running_config`,
      credentials,
    )
      .then((resp) => {
        setRunningConfig(resp.data);
      })
      .catch((error) => {
        // loading status
        setErrors([error]);
        setRunningConfig({ config: error.message });
      });
  }

  function getGeneratedConfig() {
    setGeneratedConfig({
      generated_config: <Loader className="modalloader" />,
    });
    const credentials = localStorage.getItem("token");
    getData(
      `${process.env.API_URL}/api/v1.0/device/${hostname}/generate_config`,
      credentials,
    )
      .then((resp) => {
        setGeneratedConfig(resp.data.config);
      })
      .catch((error) => {
        // loading status
        setErrors([error]);
        setRunningConfig({ generated_config: error.message });
      });
  }

  useEffect(() => {
    if (hostname) {
      if (state === "MANAGED") {
        getRunningConfig();
      }
      getGeneratedConfig();
    } else {
      clearForm();
    }
  }, [hostname, state]);

  return (
    <Modal open={isOpen} onClose={handleCancel} size="fullscreen">
      <ModalHeader>Show config for {hostname}</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <Grid columns="equal">
            <GridRow>
              <GridColumn>
                <h1>Device Running Config</h1>
              </GridColumn>
              <GridColumn>
                <h1>NMS Generated Config</h1>
              </GridColumn>
            </GridRow>
            <GridRow>
              <GridColumn>
                <ButtonGroup>
                  <Popup
                    content="Copy running config"
                    floated="right"
                    trigger={
                      <Button
                        onClick={() =>
                          navigator.clipboard.writeText(runningConfig.config)
                        }
                        icon="copy"
                        size="small"
                      />
                    }
                    position="bottom right"
                  />
                  <Popup
                    content="Refresh running config"
                    floated="right"
                    trigger={
                      <Button
                        onClick={() => getRunningConfig()}
                        icon="refresh"
                        size="small"
                      />
                    }
                    position="bottom right"
                  />
                </ButtonGroup>
                <Segment>
                  {typeof runningConfig.config === "object" ? (
                    runningConfig.config
                  ) : (
                    <pre className="fullconfig">{runningConfig.config}</pre>
                  )}
                </Segment>
              </GridColumn>
              <GridColumn>
                <ButtonGroup>
                  <Popup
                    content="Copy NMS generated config"
                    floated="right"
                    trigger={
                      <Button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            generatedConfig.generated_config,
                          )
                        }
                        icon="copy"
                        size="small"
                      />
                    }
                    position="bottom center"
                  />
                  <Popup
                    content="Refresh NMS generated config"
                    floated="right"
                    trigger={
                      <Button
                        onClick={() => getGeneratedConfig()}
                        icon="refresh"
                        size="small"
                      />
                    }
                    position="bottom center"
                  />
                  <Popup
                    content="Copy available variables for templates"
                    floated="right"
                    trigger={
                      <Button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            JSON.stringify(
                              generatedConfig.available_variables,
                              null,
                              2,
                            ),
                          )
                        }
                        icon="code"
                        size="small"
                      />
                    }
                    position="bottom center"
                  />
                </ButtonGroup>
                <Segment>
                  <Loader />
                  {typeof generatedConfig.generated_config === "object" ? (
                    <div>{generatedConfig.generated_config}</div>
                  ) : (
                    <pre className="fullconfig">
                      {generatedConfig.generated_config}
                    </pre>
                  )}
                </Segment>
              </GridColumn>
            </GridRow>
            <GridRow>
              <GridColumn>
                <ul id="error_list" style={{ color: "red" }}>
                  {errors.map((err, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={index}>{err.message}</li>
                  ))}
                </ul>
              </GridColumn>
            </GridRow>
          </Grid>
        </ModalDescription>
      </ModalContent>
      <ModalActions>
        <Button color="black" onClick={handleCancel}>
          Close <Icon name="cancel" />
        </Button>
      </ModalActions>
    </Modal>
  );
}

ShowConfigModal.propTypes = {
  hostname: PropTypes.string,
  state: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  closeAction: PropTypes.func.isRequired,
};

ShowConfigModal.defaultProps = {
  hostname: null,
  state: "MANAGED",
};

export default ShowConfigModal;
