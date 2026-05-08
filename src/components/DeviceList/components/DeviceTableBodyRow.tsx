import { useEffect, useState, type ReactNode } from "react";
import { TableCell, TableRow } from "semantic-ui-react";
import type { DeviceColumnKey } from "../types/columns";
import type { Device } from "../../../types/device";
import { DeviceTableBodyRowCellContent } from "./DeviceTableBodyRowCellContent";

interface DeviceTableBodyRowProps {
  readonly device: Device;
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly mangleDeviceData: (device: Device) => ReactNode;
  readonly defaultOpen: boolean;
  readonly getAdditionalDeviceData: (hostname: string) => void;
}

export function DeviceTableBodyRow({
  device,
  activeColumns,
  mangleDeviceData,
  defaultOpen,
  getAdditionalDeviceData,
}: DeviceTableBodyRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const deviceInfo = mangleDeviceData(device);

  // Auto-fetch details when row mounts already-open ("Go to device" toast).
  useEffect(() => {
    if (defaultOpen) getAdditionalDeviceData(device.hostname);
  }, [defaultOpen, device.hostname, getAdditionalDeviceData]);

  const handleRowClick = () => {
    if (!open) getAdditionalDeviceData(device.hostname);
    setOpen((prev) => !prev);
  };

  return (
    <>
      <TableRow onClick={handleRowClick}>
        {activeColumns.map((column) => (
          <TableCell
            key={`${device.id}_${column}`}
            collapsing
            style={{
              overflow: "hidden",
              ...(column === "id" && {
                maxWidth: "7em",
                minWidth: "7em",
              }),
            }}
          >
            <DeviceTableBodyRowCellContent
              device={device}
              column={column}
              open={open}
            />
          </TableCell>
        ))}
      </TableRow>
      <TableRow hidden={!open}>
        <TableCell
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
          }}
        >
          {deviceInfo}
        </TableCell>
      </TableRow>
    </>
  );
}
