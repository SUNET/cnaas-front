import ClearIcon from "@mui/icons-material/Clear";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Tooltip } from "../../../components/Tooltip";
import { DEVICE_STATES, DEVICE_TYPES } from "../../../types/device";
import {
  useDeviceList,
  useDeviceListPageActions,
} from "../stores/DeviceListContext";
import {
  COLUMN_MAP,
  type DeviceColumnKey,
  type FilterData,
} from "../types/table";

type DeviceTableHeaderFilterProps = {
  readonly column: DeviceColumnKey;
};

const synchronizedOptions = [
  { key: "NONE", value: "", text: "" },
  { key: "true", value: "true", text: "Synchronized" },
  { key: "false", value: "false", text: "Unsynchronized" },
];

// Derived from the DeviceState/DeviceType unions so adding a new literal
// automatically appears as a filter option.
const stateOptions = [
  { key: "NONE", value: "", text: "" },
  ...DEVICE_STATES.map((v) => ({ key: v, value: v, text: v })),
];

const deviceTypeOptions = [
  { key: "NONE", value: "", text: "" },
  ...DEVICE_TYPES.map((v) => ({ key: v, value: v, text: v })),
];

function dropdownValueToString(value: string): string {
  return typeof value === "string" ? value : "";
}

export function DeviceTableHeaderFilter({
  column,
}: DeviceTableHeaderFilterProps) {
  const { state } = useDeviceList();
  const { handleFilterChange } = useDeviceListPageActions();
  const { filterData } = state;
  const [localFilter, setLocalFilter] = useState<FilterData>(filterData);
  // Track the last filterData we've synced from, so we can adjust local
  // state during render (React's recommended pattern for syncing state from
  // props) instead of via an effect, which would cause an extra render.
  const [prevFilterData, setPrevFilterData] = useState(filterData);
  if (filterData !== prevFilterData) {
    setPrevFilterData(filterData);
    setLocalFilter(filterData);
  }
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    },
    [],
  );

  const handleFilterColumnChange = (col: string, value: string) => {
    handleFilterChange({ ...filterData, [col]: value });
  };

  const onChange = (col: string, value: string) => {
    setLocalFilter((prev) => ({ ...prev, [col]: value }));
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      handleFilterColumnChange(col, value);
    }, 250);
  };

  const popupContent = `Filter ${COLUMN_MAP[column]}`;
  const currentValue = localFilter[column] ?? "";

  const clearAdornment = currentValue !== "" && (
    <IconButton
      size="small"
      aria-label={`Clear ${COLUMN_MAP[column]} filter`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        handleFilterColumnChange(column, "");
      }}
    >
      <ClearIcon fontSize="small" />
    </IconButton>
  );

  if (column === "synchronized") {
    return (
      <Tooltip title={popupContent}>
        <Select
          onChange={(event: SelectChangeEvent) => {
            handleFilterColumnChange(
              column,
              dropdownValueToString(event.target.value),
            );
          }}
          value={currentValue}
          startAdornment={clearAdornment}
          variant="outlined"
          size="small"
          style={{ minWidth: "100%" }}
        >
          {synchronizedOptions.map((option) => (
            <MenuItem key={option.key} value={option.value}>
              {option.text}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
    );
  }
  if (column === "state") {
    return (
      <Tooltip title={popupContent}>
        <Select
          onChange={(event: SelectChangeEvent) => {
            handleFilterColumnChange(
              column,
              dropdownValueToString(event.target.value),
            );
          }}
          value={currentValue}
          startAdornment={clearAdornment}
          variant="outlined"
          size="small"
          style={{ minWidth: "100%" }}
        >
          {stateOptions.map((option) => (
            <MenuItem key={option.key} value={option.value}>
              {option.text}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
    );
  }
  if (column === "device_type") {
    return (
      <Tooltip title={popupContent}>
        <Select
          onChange={(event: SelectChangeEvent) => {
            handleFilterColumnChange(
              column,
              dropdownValueToString(event.target.value),
            );
          }}
          value={currentValue}
          startAdornment={clearAdornment}
          variant="outlined"
          size="small"
          style={{ minWidth: "100%" }}
        >
          {deviceTypeOptions.map((option) => (
            <MenuItem key={option.key} value={option.value}>
              {option.text}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={popupContent}>
      <TextField
        size="small"
        value={currentValue}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(column, e.target.value)
        }
        sx={{ minWidth: "100%" }}
      />
    </Tooltip>
  );
}
