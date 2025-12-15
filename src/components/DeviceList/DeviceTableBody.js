import PropTypes from "prop-types";
import { Loader, TableBody, TableCell, TableRow } from "semantic-ui-react";
import { DeviceTableBodyRow } from "./DeviceTableBodyRow";

DeviceTableBody.propTypes = {
  deviceData: PropTypes.arrayOf(PropTypes.object),
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  error: PropTypes.object,
  defaultOpen: PropTypes.bool,
  mangleDeviceData: PropTypes.func,
  getAdditionalDeviceData: PropTypes.func,
};

export function DeviceTableBody({
  deviceData,
  activeColumns,
  loading,
  error,
  mangleDeviceData,
  defaultOpen,
  getAdditionalDeviceData,
}) {
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
      {deviceData?.map((device) => (
        <DeviceTableBodyRow
          key={`${device.id}_row`}
          device={device}
          activeColumns={activeColumns}
          mangleDeviceData={mangleDeviceData}
          defaultOpen={defaultOpen}
          getAdditionalDeviceData={getAdditionalDeviceData}
        />
      ))}
    </TableBody>
  );
}
