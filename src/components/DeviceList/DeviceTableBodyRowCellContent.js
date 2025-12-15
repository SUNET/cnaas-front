import PropTypes from "prop-types";
import { Icon } from "semantic-ui-react";

DeviceTableBodyRowCellContent.propTypes = {
  device: PropTypes.object,
  column: PropTypes.string,
  open: PropTypes.bool,
};

export function DeviceTableBodyRowCellContent({ device, column, open }) {
  const value = device[column];

  if (column === "state" && device.deleted) return "DELETED";
  if (column === "synchronized" && device.state !== "MANAGED") return;
  if (column === "synchronized") {
    return (
      <>
        {value ? "Synchronized" : "Unsynchronized"}
        <Icon
          name={value ? "check" : "delete"}
          color={value ? "green" : "red"}
          style={{ marginLeft: "5px" }}
        />
      </>
    );
  }
  if (column == "id") {
    return (
      <>
        <Icon name={open ? "angle down" : "angle right"} />
        {value}
      </>
    );
  }
  if (
    column === "hostname" &&
    device.state === "MANAGED" &&
    device.device_type === "ACCESS"
  ) {
    return (
      <>
        {value}
        {column === "hostname" &&
          device.state === "MANAGED" &&
          device.device_type === "ACCESS" && (
            <a
              key="interfaceconfig"
              href={`/interface-config?hostname=${device.hostname}`}
            >
              <Icon name="plug" link />
            </a>
          )}
      </>
    );
  }
  return value;
}
