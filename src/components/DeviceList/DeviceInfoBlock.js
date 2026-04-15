import PropTypes from "prop-types";
import { Dropdown, Grid, GridColumn, GridRow } from "semantic-ui-react";
import { usePermissions } from "../../contexts/PermissionsContext";
import { DeviceInfoTable } from "../DeviceInfoTable";
import LogViewer from "../LogViewer";

DeviceInfoBlock.propTypes = {
  device: PropTypes.object,
  menuActions: PropTypes.any,
  deviceStateExtra: PropTypes.any,
  deviceInterfaceData: PropTypes.any,
  log: PropTypes.any,
  model: PropTypes.any,
  netboxDevice: PropTypes.any,
};

export default function DeviceInfoBlock({
  device,
  menuActions,
  deviceStateExtra,
  deviceInterfaceData,
  log,
  model,
  netboxDevice,
}) {
  const { permissionsCheck } = usePermissions();

  return (
    <Grid columns={2}>
      <GridRow>
        <GridColumn>
          {permissionsCheck("Devices", "write") && (
            <Dropdown text="Actions" button>
              <Dropdown.Menu>{menuActions}</Dropdown.Menu>
            </Dropdown>
          )}
          <DeviceInfoTable
            device={device}
            model={model}
            netboxDevice={netboxDevice}
          />
        </GridColumn>
      </GridRow>
      <GridRow style={{ paddingTop: 0, paddingBottom: 0 }}>
        <GridColumn width={16}>
          {deviceStateExtra}
          {deviceInterfaceData}
        </GridColumn>
      </GridRow>
      <GridRow style={{ overflow: "hidden" }}>
        {(!log[device.id] || log[device.id]?.length !== 0) && (
          <GridColumn width={16}>
            <LogViewer logs={log[device.id]} />
          </GridColumn>
        )}
      </GridRow>
    </Grid>
  );
}
