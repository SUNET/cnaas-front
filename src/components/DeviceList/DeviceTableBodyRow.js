import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { TableCell, TableRow } from "semantic-ui-react";
import { DeviceTableBodyRowCellContent } from "./DeviceTableBodyRowCellContent";

DeviceTableBodyRow.propTypes = {
  device: PropTypes.object,
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  mangleDeviceData: PropTypes.func,
  defaultOpen: PropTypes.bool,
  getAdditionalDeviceData: PropTypes.func,
};

export function DeviceTableBodyRow({
  device,
  activeColumns,
  mangleDeviceData,
  defaultOpen,
  getAdditionalDeviceData,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const deviceInfo = mangleDeviceData(device);

  // When device changes and defaultOpen is set open the row
  useEffect(() => {
    if (!open && defaultOpen) {
      getAdditionalDeviceData(device.hostname);
      setOpen(true);
      // If the row is already opened we can fetch additional data
    } else if (open && defaultOpen) {
      getAdditionalDeviceData(device.hostname);
    }
  }, [device]);

  const handleRowClick = () => {
    // Only fetch when opening the row
    // That means the current state is open == false
    if (!open) getAdditionalDeviceData(device.hostname);
    setOpen((prev) => !prev);
  };

  return (
    <>
      <TableRow key={device.id} onClick={() => handleRowClick()}>
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
      <TableRow key={`${device.id}_content`} hidden={!open}>
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
