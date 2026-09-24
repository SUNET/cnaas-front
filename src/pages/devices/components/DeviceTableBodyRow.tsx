import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

import type { DeviceColumnKey } from "../types/table";
import type { Device } from "../../../types/device";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import { DeviceTableBodyRowCellContent } from "./DeviceTableBodyRowCellContent";
import { DeviceExpanded } from "./expanded/DeviceExpanded";

type DeviceTableBodyRowProps = {
  readonly device: Device;
  readonly activeColumns: readonly DeviceColumnKey[];
};

export function DeviceTableBodyRow({
  device,
  activeColumns,
}: DeviceTableBodyRowProps) {
  const { state, dispatch } = useDeviceList();
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
