import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { Input, Popup, Select } from "semantic-ui-react";

import { COLUMN_MAP } from "./DeviceList";

DeviceTableHeaderFilter.propTypes = {
  column: PropTypes.string,
  filterData: PropTypes.object,
  handleFilterColumnChange: PropTypes.func,
};

export function DeviceTableHeaderFilter({
  column,
  filterData,
  handleFilterColumnChange,
}) {
  const [localFilter, setLocalFilter] = useState(filterData);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    setLocalFilter(filterData);
  }, [filterData]);

  const onChange = (column, value) => {
    // Update input immediately
    setLocalFilter((prev) => ({ ...prev, [column]: value }));

    // Clear previous debounce
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    // Set new debounce
    debounceTimeout.current = setTimeout(() => {
      handleFilterColumnChange(column, value); // triggers fetch
    }, 250);
  };

  const synchronizedOptions = [
    { key: "NONE", value: "", text: "" },
    { key: "true", value: "true", text: "Synchronized" },
    { key: "false", value: "false", text: "Unsynchronized" },
  ];

  const stateOptions = [
    { key: "NONE", value: "", text: "" },
    { key: "MANAGED", value: "MANAGED", text: "MANAGED" },
    { key: "UNMANAGED", value: "UNMANAGED", text: "UNMANAGED" },
    { key: "DHCP_BOOT", value: "DHCP_BOOT", text: "DHCP_BOOT" },
    { key: "DISCOVERED", value: "DISCOVERED", text: "DISCOVERED" },
    { key: "INIT", value: "INIT", text: "INIT" },
    { key: "UNKNOWN", value: "UNKNOWN", text: "UNKNOWN" },
    { key: "PRE_CONFIGURED", value: "PRE_CONFIGURED", text: "PRE_CONFIGURED" },
  ];

  const deviceTypeOptions = [
    { key: "NONE", value: "", text: "" },
    { key: "UNKNOWN", value: "UNKNOWN", text: "UNKNOWN" },
    { key: "ACCESS", value: "ACCESS", text: "ACCESS" },
    { key: "DIST", value: "DIST", text: "DIST" },
    { key: "CORE", value: "CORE", text: "CORE" },
    { key: "FIREWALL", value: "FIREWALL", text: "FIREWALL" },
  ];

  if (column === "synchronized") {
    return (
      <Popup
        content={`Filter ${COLUMN_MAP[column]}`}
        trigger={
          <Select
            onChange={(_, data) => {
              handleFilterColumnChange(column, data.value);
            }}
            value={localFilter[column] || ""}
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
        content={`Filter ${COLUMN_MAP[column]}`}
        trigger={
          <Select
            onChange={(_, data) => {
              handleFilterColumnChange(column, data.value);
            }}
            value={localFilter[column] || ""}
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
        content={`Filter ${COLUMN_MAP[column]}`}
        trigger={
          <Select
            onChange={(_, data) => {
              handleFilterColumnChange(column, data.value);
            }}
            value={localFilter[column] || ""}
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
      content={`Filter ${COLUMN_MAP[column]}`}
      trigger={
        <Input
          value={localFilter[column] || ""}
          onChange={(e) => onChange(column, e.target.value)}
          style={{ minWidth: "100%" }}
        />
      }
    />
  );
}
