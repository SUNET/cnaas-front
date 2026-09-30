import Autocomplete from "@mui/material/Autocomplete";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
import { type SyntheticEvent } from "react";

import { useInterfaceConfig } from "../../stores/InterfaceConfigContext";

const IF_CLASS_OPTIONS = [
  { value: "downlink", text: "Downlink" },
  { value: "fabric", text: "Fabric link" },
  { value: "custom", text: "Custom" },
  { value: "port_template", text: "Port template" },
];

export function PortTypeCellDist({
  addPortTemplateOption,
  currentIfClass,
  editDisabled,
  item,
  portTemplate,
  updateFieldData,
}: {
  readonly item: Record<string, unknown>;
  readonly currentIfClass: string | null;
  readonly portTemplate: string | null;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent | Event,
    data: Record<string, unknown>,
  ) => void;
  readonly addPortTemplateOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}) {
  const { state } = useInterfaceConfig();
  const portTemplateOptions = state.portTemplates.map((pt) => pt.name);
  const portTemplateDescriptions = new Map(
    state.portTemplates.map((pt) => [pt.name, pt.description]),
  );

  return (
    <TableCell>
      <Select
        key={`ifclass|${item.name}`}
        name={`ifclass|${item.name}`}
        size="small"
        fullWidth
        defaultValue={currentIfClass ?? ""}
        disabled={editDisabled}
        onChange={(e: SelectChangeEvent) =>
          updateFieldData(e, {
            name: `ifclass|${item.name}`,
            value: e.target.value,
          })
        }
      >
        {IF_CLASS_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.text}
          </MenuItem>
        ))}
      </Select>
      {currentIfClass === "port_template" && (
        <Autocomplete
          key={`port_template|${item.name}`}
          size="small"
          fullWidth
          freeSolo
          disabled={editDisabled}
          options={portTemplateOptions}
          defaultValue={portTemplate ?? undefined}
          getOptionLabel={(name) => name}
          renderOption={(props, name) => (
            <li {...props} key={name}>
              {name}
              {portTemplateDescriptions.get(name) &&
                ` - ${portTemplateDescriptions.get(name)}`}
            </li>
          )}
          onChange={(e, newValue) => {
            const value = newValue ?? "";
            addPortTemplateOption(e, {
              name: `port_template|${item.name}`,
              value,
            });
            updateFieldData(e, {
              name: `port_template|${item.name}`,
              value,
            });
          }}
          renderInput={(params) => (
            <TextField {...params} name={`port_template|${item.name}`} />
          )}
        />
      )}
    </TableCell>
  );
}
