import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import { type SyntheticEvent } from "react";
import { Tooltip } from "../../../../components/Tooltip";

// --- Tags column ---

type TagsColumnProps = {
  readonly interfaceName: string;
  readonly tags: string[];
  readonly editDisabled: boolean;
  readonly tagOptions: string[];
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addTagOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

export function TagsColumn({
  interfaceName,
  tags,
  editDisabled,
  tagOptions,
  updateFieldData,
  addTagOption,
}: TagsColumnProps) {
  const handleChange = (e: SyntheticEvent, newValue: string[]) => {
    newValue.forEach((tag) => {
      if (!tagOptions.includes(tag)) {
        addTagOption(e, { name: `tags|${interfaceName}`, value: tag });
      }
    });
    updateFieldData(e, {
      name: `tags|${interfaceName}`,
      value: newValue,
    });
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      fullWidth
      options={tagOptions}
      value={tags}
      disabled={editDisabled}
      onChange={(e, newValue) => handleChange(e, newValue)}
      renderInput={(params) => (
        <TextField {...params} name={`tags|${interfaceName}`} />
      )}
    />
  );
}

// --- JSON column ---

type JsonColumnProps = {
  readonly data: Record<string, unknown> | undefined;
};

export function JsonColumn({ data }: JsonColumnProps) {
  if (!data) return null;

  return (
    <Tooltip
      title={
        <>
          <h4>Raw JSON data</h4>
          {JSON.stringify(data)}
        </>
      }
      placement="top-end"
    >
      <span>
        <MoreHorizIcon sx={{ color: "grey" }} />
      </span>
    </Tooltip>
  );
}

// --- Aggregate ID column ---

type AggregateIdColumnProps = {
  readonly interfaceName: string;
  readonly aggregateId: unknown;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

export function AggregateIdColumn({
  interfaceName,
  aggregateId,
  editDisabled,
  updateFieldData,
}: AggregateIdColumnProps) {
  const normalizedAggregateId =
    typeof aggregateId === "number" || typeof aggregateId === "string"
      ? aggregateId
      : "";

  return (
    <TextField
      key={`aggregate_id|${interfaceName}|${normalizedAggregateId}`}
      name={`aggregate_id|${interfaceName}`}
      size="small"
      defaultValue={normalizedAggregateId}
      disabled={editDisabled}
      onChange={(e) =>
        updateFieldData(e, {
          name: `aggregate_id|${interfaceName}`,
          value: e.target.value,
        })
      }
    />
  );
}

// --- BPDU filter column ---

type BpduFilterColumnProps = {
  readonly interfaceName: string;
  readonly bpduFilter: boolean;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

export function BpduFilterColumn({
  interfaceName,
  bpduFilter,
  editDisabled,
  updateFieldData,
}: BpduFilterColumnProps) {
  return (
    <Tooltip title="Enable spanning-tree BPDU filter on this interface">
      <span>
        <Checkbox
          name={`bpdu_filter|${interfaceName}`}
          defaultChecked={bpduFilter}
          onChange={(e) =>
            updateFieldData(e, {
              name: `bpdu_filter|${interfaceName}`,
              checked: e.target.checked,
            })
          }
          disabled={editDisabled}
        />
      </span>
    </Tooltip>
  );
}
