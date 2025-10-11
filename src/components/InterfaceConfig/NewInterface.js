import { useState } from "react";

import { Button, Modal, Icon, Dropdown } from "semantic-ui-react";

import PropTypes from "prop-types";

function NewInterface({ suggestedInterfaces, addNewInterface }) {
  const [open, setOpen] = useState(false);
  const [interfaceName, setInterfaceName] = useState("");

  const addInterfaceOption = (e, data) => {
    const { value } = data;
    setInterfaceName(value);
  };

  const selectInterface = (e, data) => {
    const { value } = data;
    setInterfaceName(value);
  };

  const interfaceOptions = suggestedInterfaces.map((optionName) => ({
    key: optionName,
    text: optionName,
    value: optionName,
  }));

  if (interfaceName) {
    // if interfaceOptions array does not have object with text equal to interface
    if (!interfaceOptions.find((option) => option.text === interfaceName)) {
      interfaceOptions.push({
        key: interfaceName,
        text: interfaceName,
        value: interfaceName,
      });
    }
  }

  return (
    <Modal
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      open={open}
      trigger={
        <Button icon labelPosition="right">
          Add new interface...
          <Icon name="window restore outline" />
        </Button>
      }
    >
      <Modal.Header>Add new interface</Modal.Header>
      <Modal.Content>
        <Dropdown
          placeholder="Select interface"
          fluid
          selection
          search
          allowAdditions
          defaultValue={interfaceName}
          options={interfaceOptions}
          onAddItem={addInterfaceOption}
          onChange={selectInterface}
        />
      </Modal.Content>
      <Modal.Actions>
        <Button
          key="close"
          color="black"
          onClick={() => {
            setOpen(false);
          }}
        >
          Close
        </Button>
        <Button
          key="add"
          onClick={() => {
            addNewInterface(interfaceName);
            setOpen(false);
          }}
          positive
        >
          Add
        </Button>
      </Modal.Actions>
    </Modal>
  );
}

NewInterface.propTypes = {
  suggestedInterfaces: PropTypes.arrayOf(PropTypes.string).isRequired,
  addNewInterface: PropTypes.func.isRequired,
};

export default NewInterface;
