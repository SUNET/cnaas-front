import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Input, Popup, Select, type DropdownProps } from "semantic-ui-react";

import { COLUMN_MAP, type DeviceColumnKey } from "../columns";
import type { FilterData } from "../stores/deviceListReducer";
import { DEVICE_STATES, DEVICE_TYPES } from "../../../types/device";

interface DeviceTableHeaderFilterProps {
  readonly column: DeviceColumnKey;
  readonly filterData: FilterData;
  readonly handleFilterColumnChange: (column: string, value: string) => void;
}

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

function dropdownValueToString(value: DropdownProps["value"]): string {
  return typeof value === "string" ? value : "";
}

export function DeviceTableHeaderFilter({
  column,
  filterData,
  handleFilterColumnChange,
}: DeviceTableHeaderFilterProps) {
  const [localFilter, setLocalFilter] = useState<FilterData>(filterData);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalFilter(filterData);
  }, [filterData]);

  useEffect(
    () => () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    },
    [],
  );

  const onChange = (col: string, value: string) => {
    setLocalFilter((prev) => ({ ...prev, [col]: value }));
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      handleFilterColumnChange(col, value);
    }, 250);
  };

  const popupContent = `Filter ${COLUMN_MAP[column]}`;
  const currentValue = localFilter[column] ?? "";

  if (column === "synchronized") {
    return (
      <Popup
        content={popupContent}
        trigger={
          <Select
            onChange={(_, data) => {
              handleFilterColumnChange(
                column,
                dropdownValueToString(data.value),
              );
            }}
            value={currentValue}
            options={synchronizedOptions}
            style={{ minWidth: "100%" }}
            clearable
            closeOnEscape
          />
        }
      />
    );
  }
  if (column === "state") {
    return (
      <Popup
        content={popupContent}
        trigger={
          <Select
            onChange={(_, data) => {
              handleFilterColumnChange(
                column,
                dropdownValueToString(data.value),
              );
            }}
            value={currentValue}
            options={stateOptions}
            style={{ minWidth: "100%" }}
            clearable
            closeOnEscape
          />
        }
      />
    );
  }
  if (column === "device_type") {
    return (
      <Popup
        content={popupContent}
        trigger={
          <Select
            onChange={(_, data) => {
              handleFilterColumnChange(
                column,
                dropdownValueToString(data.value),
              );
            }}
            value={currentValue}
            options={deviceTypeOptions}
            style={{ minWidth: "100%" }}
            clearable
            closeOnEscape
          />
        }
      />
    );
  }
  return (
    <Popup
      content={popupContent}
      trigger={
        <Input
          value={currentValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(column, e.target.value)
          }
          style={{ minWidth: "100%" }}
        />
      }
    />
  );
}
