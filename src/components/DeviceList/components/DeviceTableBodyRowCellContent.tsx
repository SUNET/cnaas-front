import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "semantic-ui-react";

import type { DeviceColumnKey } from "../types/table";
import type { Device } from "../../../types/device";
import { isAccessDevice, isManaged } from "../../../types/device";

type DeviceTableBodyRowCellContentProps = {
  readonly device: Device;
  readonly column: DeviceColumnKey;
  readonly open: boolean;
};

export function DeviceTableBodyRowCellContent({
  device,
  column,
  open,
}: DeviceTableBodyRowCellContentProps): ReactNode {
  if (column === "state" && device.deleted) return "DELETED";
  if (column === "synchronized" && !isManaged(device)) return null;

  if (column === "synchronized") {
    const synchronized = Boolean(device.synchronized);
    return (
      <>
        {synchronized ? "Synchronized" : "Unsynchronized"}
        <Icon
          name={synchronized ? "check" : "delete"}
          color={synchronized ? "green" : "red"}
          style={{ marginLeft: "5px" }}
        />
      </>
    );
  }
  if (column === "id") {
    return (
      <>
        <Icon name={open ? "angle down" : "angle right"} />
        {device.id}
      </>
    );
  }
  if (column === "hostname" && isManaged(device) && isAccessDevice(device)) {
    return (
      <>
        {device.hostname}
        <Link
          key="interfaceconfig"
          to={`/interface-config?hostname=${device.hostname}`}
        >
          <Icon name="plug" link />
        </Link>
      </>
    );
  }
  const value = device[column];
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}
