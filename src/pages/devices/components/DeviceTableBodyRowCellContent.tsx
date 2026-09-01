import type { ReactNode } from "react";
import { Link } from "react-router";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PowerIcon from "@mui/icons-material/Power";

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
        {synchronized ? (
          <CheckIcon
            sx={{ color: "success.main", ml: "5px", verticalAlign: "middle" }}
          />
        ) : (
          <CancelIcon
            sx={{ color: "error.main", ml: "5px", verticalAlign: "middle" }}
          />
        )}
      </>
    );
  }
  if (column === "id") {
    return (
      <>
        {open ? (
          <KeyboardArrowDownIcon
            data-testid="angle-down"
            sx={{ verticalAlign: "middle" }}
          />
        ) : (
          <KeyboardArrowRightIcon
            data-testid="angle-right"
            sx={{ verticalAlign: "middle" }}
          />
        )}
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
          <PowerIcon sx={{ verticalAlign: "middle" }} />
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
