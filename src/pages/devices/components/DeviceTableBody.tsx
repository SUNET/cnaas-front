import CircularProgress from "@mui/material/CircularProgress";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

import { useDeviceList } from "../stores/DeviceListContext";
import { DeviceTableBodyRow } from "./DeviceTableBodyRow";

export function DeviceTableBody() {
  const {
    state: { deviceData, activeColumns, loading, error },
  } = useDeviceList();
  if (loading) {
    return (
      <TableBody>
        <TableRow key="Loading">
          <TableCell align="center" colSpan={activeColumns.length}>
            <CircularProgress size="1em" /> Loading devices...
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={activeColumns.length}>
            API Error: {error.message}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (deviceData.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={activeColumns.length}>No data</TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {deviceData.map((device) => (
        <DeviceTableBodyRow key={`${device.id}_row`} device={device} />
      ))}
    </TableBody>
  );
}
