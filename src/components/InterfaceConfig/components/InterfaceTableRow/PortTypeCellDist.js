import PropTypes from "prop-types";
import { Dropdown, Table } from "semantic-ui-react";

const IF_CLASS_OPTIONS = [
  { value: "downlink", text: "Downlink" },
  { value: "fabric", text: "Fabric link" },
  { value: "custom", text: "Custom" },
  { value: "port_template", text: "Port template" },
];

PortTypeCellDist.propTypes = {
  addPortTemplateOption: PropTypes.func,
  currentIfClass: PropTypes.string,
  editDisabled: PropTypes.bool,
  item: PropTypes.object,
  portTemplate: PropTypes.string,
  portTemplateOptions: PropTypes.array,
  updateFieldData: PropTypes.func,
};

export function PortTypeCellDist({
  addPortTemplateOption,
  currentIfClass,
  editDisabled,
  item,
  portTemplate,
  portTemplateOptions,
  updateFieldData,
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
      {currentIfClass === "port_template" && (
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
