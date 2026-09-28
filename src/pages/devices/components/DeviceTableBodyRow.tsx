import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

import type { Device } from "../../../types/device";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import { DeviceTableBodyRowCellContent } from "./DeviceTableBodyRowCellContent";
import { DeviceExpanded } from "./expanded/DeviceExpanded";

type DeviceTableBodyRowProps = {
  readonly device: Device;
};

export function DeviceTableBodyRow({ device }: DeviceTableBodyRowProps) {
  const { state, dispatch } = useDeviceList();
  const { activeColumns } = state;
  const open = state.expandedIds.has(device.id);

  const handleRowClick = () => {
    dispatch({ type: actions.TOGGLE_DEVICE_EXPANDED, deviceId: device.id });
  };

  return (
    <>
      <TableRow onClick={handleRowClick}>
        {activeColumns.map((column) => (
          <TableCell
            key={`${device.id}_${column}`}
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
      {open && (
        <TableRow>
          <TableCell
            colSpan={activeColumns.length}
            style={{
              overflow: "visible",
            }}
          >
            <DeviceExpanded device={device} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
