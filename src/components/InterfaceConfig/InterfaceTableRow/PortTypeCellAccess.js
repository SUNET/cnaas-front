import PropTypes from "prop-types";
import { Dropdown, Table, Popup, Checkbox } from "semantic-ui-react";

const CONFIG_TYPE_OPTIONS = [
  { value: "ACCESS_AUTO", text: "Auto/dot1x" },
  { value: "ACCESS_UNTAGGED", text: "Untagged/access" },
  { value: "ACCESS_TAGGED", text: "Tagged/trunk" },
  { value: "ACCESS_DOWNLINK", text: "Downlink" },
  { value: "ACCESS_UPLINK", text: "Uplink", disabled: true },
  { value: "MLAG_PEER", text: "MLAG peer interface", disabled: true },
];

PortTypeCellAccess.propTypes = {
  currentConfigtype: PropTypes.string,
  editDisabled: PropTypes.bool,
  fields: PropTypes.object,
  item: PropTypes.object,
  updateFieldData: PropTypes.func,
};

export function PortTypeCellAccess({
  currentConfigtype,
  editDisabled,
  fields,
  item,
  updateFieldData,
}) {
  return (
    <Table.Cell>
      <Dropdown
        key={`configtype|${item.name}`}
        name={`configtype|${item.name}`}
        selection
        options={CONFIG_TYPE_OPTIONS}
        defaultValue={item.configtype}
        disabled={editDisabled}
        onChange={updateFieldData}
      />

      {currentConfigtype === "ACCESS_DOWNLINK" && (
        <Popup
          key="doIneedThisKey?"
          header="Redundant Link: true/false"
          content="Disable ZTP redundant link check for this downlink interface by unchecking this box"
          wide
          trigger={
            <Checkbox
              key={`redundant_link|${item.name}`}
              name={`redundant_link|${item.name}`}
              defaultChecked={fields.redundant_link}
              disabled={editDisabled}
              onChange={updateFieldData}
            />
          }
        />
      )}
    </Table.Cell>
  );
}
