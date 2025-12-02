import { Dropdown, Table } from "semantic-ui-react";

const IF_CLASS_OPTIONS = [
  { value: "downlink", text: "Downlink" },
  { value: "fabric", text: "Fabric link" },
  { value: "custom", text: "Custom" },
  { value: "port_template", text: "Port template" },
];

export function PortTypeCellDist({
  currentIfClass,
  editDisabled,
  item,
  addPortTemplateOption,
  updateFieldData,
  portTemplate,
  portTemplateOptions,
}) {
  return (
    <Table.Cell>
      <Dropdown
        key={`ifclass|${item.name}`}
        name={`ifclass|${item.name}`}
        selection
        options={IF_CLASS_OPTIONS}
        defaultValue={currentIfClass}
        disabled={editDisabled}
        onChange={updateFieldData}
      />
      {currentIfClass == "port_template" && (
        <Dropdown
          key={`port_template|${item.name}`}
          name={`port_template|${item.name}`}
          fluid
          selection
          search
          allowAdditions
          options={portTemplateOptions}
          defaultValue={portTemplate}
          disabled={editDisabled}
          onAddItem={addPortTemplateOption}
          onChange={updateFieldData}
        />
      )}
    </Table.Cell>
  );
}
