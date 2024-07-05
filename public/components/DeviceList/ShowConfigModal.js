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
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
} from "semantic-ui-react";
import PropTypes from "prop-types";
import { getData } from "../../utils/getData";

function ShowConfigModal({ hostname, state, isOpen, closeAction }) {
  const [runningConfig, setRunningConfig] = useState({ config: "" });
  const [generatedConfig, setGeneratedConfig] = useState({
    generated_config: "",
  });
  const [errors, setErrors] = useState([]);
  const [columnValues, setColumnValues] = useState({
    left: "running_config",
    right: "generate_config",
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname]);

  const leftColumnOptions = [
    <DropdownHeader key="device_header" content="Device config" />,
    <DropdownItem
      key="running_config"
      value="running_config"
      text="Running config"
    />,
    <DropdownDivider key="divider" />,
    <DropdownHeader key="nms_header" content="NMS generated" />,
    <DropdownItem
      key="generate_config"
      value="generate_config"
      text="Latest config from templates"
    />,
    <DropdownItem
      key="available_variables"
      value="available_variables"
      text="Available variables for templates"
    />,
  ];

  const rightColumnOptions = [
    ...leftColumnOptions,
    <DropdownDivider key="right_only_divider" />,
    <DropdownItem key="hide" value="hide" text="Hide" />,
  ];

  function updateColumn(e, data) {
    console.log(data);
    const colName = data.name;
    const val = data.value;
    const column = {};
    if (colName === "left") {
      column.left = val;
    } else {
      column.right = val;
    }
    if (val !== columnValues[colName]) {
      setColumnValues((currentValues) => ({
        ...currentValues,
        [colName]: val,
      }));
    }
  }

  const columnHeaders = {
    running_config: "Device running config",
    generate_config: "NMS generated config",
    available_variables: "Template variables",
  };

  const columnRefreshFunctions = {
    running_config: getRunningConfig,
    generate_config: getGeneratedConfig,
    available_variables: getGeneratedConfig,
  };

  const columnContents = Object.entries(columnValues).map(
    ([colName, colValue]) => {
      const headerText = columnHeaders[colValue] || colValue;
      let config = "";
      if (colValue === "running_config") {
        config = runningConfig.config;
      } else if (colValue === "generate_config") {
        config = generatedConfig.generated_config;
      } else if (colValue === "available_variables") {
        config = JSON.stringify(generatedConfig.available_variables, null, 2);
      } else {
        return null;
      }
      return (
        <GridColumn>
          <h1>{headerText}</h1>
          <ButtonGroup>
            <Popup
              content={`Copy ${headerText}`}
              floated="right"
              trigger={
                <Button
                  onClick={() => navigator.clipboard.writeText(config)}
                  icon="copy"
                  size="small"
                />
              }
              position="bottom right"
            />
            <Popup
              content={`Refresh ${headerText}`}
              floated="right"
              trigger={
                <Button
                  onClick={() => columnRefreshFunctions[colValue]()}
                  icon="refresh"
                  size="small"
                />
              }
              position="bottom right"
            />
          </ButtonGroup>
          <Segment>
            {typeof config === "object" ? (
              config
            ) : (
              <pre className="fullconfig">{config}</pre>
            )}
          </Segment>
        </GridColumn>
      );
    },
  );

  return (
    <Modal open={isOpen} onClose={handleCancel} size="fullscreen">
      <ModalHeader>Show config for {hostname}</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <Segment>
            <Dropdown
              key="left"
              name="left"
              text="Left column"
              button
              options={leftColumnOptions}
              defaultValue="running_config"
              onChange={updateColumn}
            />
            <Dropdown
              key="right"
              name="right"
              text="Right column"
              button
              options={rightColumnOptions}
              defaultValue="generate_config"
              onChange={updateColumn}
            />
          </Segment>
          <Grid columns="equal">
            <GridRow>
              {columnContents.filter((contents) => contents !== null)}
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
