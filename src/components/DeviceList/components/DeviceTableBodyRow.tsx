import { type ReactNode } from "react";
import { TableCell, TableRow } from "semantic-ui-react";
import type { DeviceColumnKey } from "../types/columns";
import type { Device } from "../../../types/device";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import { DeviceTableBodyRowCellContent } from "./DeviceTableBodyRowCellContent";
import { DeviceExpanded } from "./expanded/DeviceExpanded";

interface DeviceTableBodyRowProps {
  readonly device: Device;
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly mangleDeviceData: (device: Device) => ReactNode;
}

export function DeviceTableBodyRow({
  device,
  activeColumns,
  mangleDeviceData,
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
      {open && (
        <TableRow>
          <TableCell
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
            }}
          >
            <DeviceExpanded
              device={device}
              fallback={mangleDeviceData(device)}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
