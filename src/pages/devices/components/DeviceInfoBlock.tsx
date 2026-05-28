import type { ReactNode } from "react";
import { Dropdown, Grid, GridColumn, GridRow } from "semantic-ui-react";
import { usePermissions } from "../../../stores/PermissionsContext";
import { DeviceInfoTable } from "../../../components/DeviceInfoTable";
import LogViewer from "../../../components/LogViewer";
import type { Device } from "../../../types/device";

type DeviceInfoBlockProps = {
  readonly device: Device;
  readonly menuActions: ReactNode;
  readonly deviceStateExtra?: ReactNode;
  readonly log: { readonly [deviceId: string]: readonly string[] };
  readonly model?: unknown;
  readonly netboxDevice?: unknown;
};

export function DeviceInfoBlock({
  device,
  menuActions,
  deviceStateExtra,
  log,
  model,
  netboxDevice,
}: DeviceInfoBlockProps) {
  const { permissionsCheck } = usePermissions();
  const deviceLogs = log[device.id];
  const hasLogs = Boolean(deviceLogs && deviceLogs.length > 0);

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
      <GridRow style={{ paddingTop: 0 }}>
        <GridColumn width={16}>{deviceStateExtra}</GridColumn>
      </GridRow>
      {hasLogs && (
        <GridRow style={{ overflow: "hidden" }}>
          <GridColumn width={16}>
            <LogViewer logs={deviceLogs as string[]} />
          </GridColumn>
        </GridRow>
      )}
    </Grid>
  );
}
