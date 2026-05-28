import { useMemo, useState } from "react";
import {
  Button,
  Modal,
  Icon,
  Dropdown,
  type DropdownProps,
} from "semantic-ui-react";

export function NewInterface({
  suggestedInterfaces,
  addNewInterface,
}: {
  readonly suggestedInterfaces: string[];
  readonly addNewInterface: (interfaceName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [interfaceName, setInterfaceName] = useState("");

  const handleSetInterfaceName = (_: unknown, { value }: DropdownProps) =>
    setInterfaceName(String(value ?? ""));

  const handleAdd = () => {
    if (interfaceName) addNewInterface(interfaceName);
    setOpen(false);
  };

  const interfaceOptions = useMemo(() => {
    const baseOptions = suggestedInterfaces.map((name) => ({
      key: name,
      text: name,
      value: name,
    }));

    // If user typed something not in the list, add it
    if (
      interfaceName &&
      !baseOptions.some((opt) => opt.value === interfaceName)
    ) {
      baseOptions.push({
        key: interfaceName,
        text: interfaceName,
        value: interfaceName,
      });
    }

    return baseOptions;
  }, [suggestedInterfaces, interfaceName]);

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
          value={interfaceName}
          options={interfaceOptions}
          onAddItem={handleSetInterfaceName}
          onChange={handleSetInterfaceName}
        />
      </Modal.Content>
      <Modal.Actions>
        <Button color="black" onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button positive onClick={handleAdd}>
          Add
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
