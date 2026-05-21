import { Loader, TableBody, TableCell, TableRow } from "semantic-ui-react";
import type { DeviceColumnKey } from "../types/table";
import type { Device } from "../../../types/device";
import { DeviceTableBodyRow } from "./DeviceTableBodyRow";

type DeviceTableBodyProps = {
  readonly deviceData: readonly Device[];
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly loading: boolean;
  readonly error: Error | null;
};

export function DeviceTableBody({
  deviceData,
  activeColumns,
  loading,
  error,
}: DeviceTableBodyProps) {
  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell>
            <Loader active inline="centered">
              Loading
            </Loader>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error) {
    return (
      <TableBody>
        <TableRow>
          <TableCell>API Error: {error.message}</TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (deviceData.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell>No data</TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {deviceData.map((device) => (
        <DeviceTableBodyRow
          key={`${device.id}_row`}
          device={device}
          activeColumns={activeColumns}
        />
      ))}
    </TableBody>
  );
}
