import { type SyntheticEvent } from "react";
import { Dropdown, Table } from "semantic-ui-react";
import Checkbox from "@mui/material/Checkbox";
import { Tooltip } from "../../../../components/Tooltip";

const CONFIG_TYPE_OPTIONS = [
  { value: "ACCESS_AUTO", text: "Auto/dot1x" },
  { value: "ACCESS_UNTAGGED", text: "Untagged/access" },
  { value: "ACCESS_TAGGED", text: "Tagged/trunk" },
  { value: "ACCESS_DOWNLINK", text: "Downlink" },
  { value: "ACCESS_UPLINK", text: "Uplink", disabled: true },
  { value: "MLAG_PEER", text: "MLAG peer interface", disabled: true },
];

export function PortTypeCellAccess({
  currentConfigtype,
  editDisabled,
  fields,
  item,
  updateFieldData,
}: {
  readonly item: Record<string, unknown>;
  readonly currentConfigtype: string | null;
  readonly fields: Record<string, unknown>;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}) {
  return (
    <Table.Cell>
      <Dropdown
        key={`configtype|${item.name}`}
        name={`configtype|${item.name}`}
        selection
        options={CONFIG_TYPE_OPTIONS}
        defaultValue={item.configtype as string | undefined}
        disabled={editDisabled}
        onChange={updateFieldData}
      />

      {currentConfigtype === "ACCESS_DOWNLINK" && (
        <Tooltip
          title={
            <>
              <h4>Redundant Link: true/false</h4>
              Disable ZTP redundant link check for this downlink interface by
              unchecking this box
            </>
          }
        >
          <span>
            <Checkbox
              key={`redundant_link|${item.name}`}
              name={`redundant_link|${item.name}`}
              defaultChecked={Boolean(fields.redundant_link)}
              disabled={editDisabled}
              onChange={(e) =>
                updateFieldData(e, {
                  name: `redundant_link|${item.name}`,
                  checked: e.target.checked,
                })
              }
            />
          </span>
        </Tooltip>
      )}
    </Table.Cell>
  );
}
