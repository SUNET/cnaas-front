import type { ReactNode } from "react";
import { Dropdown } from "semantic-ui-react";
import { styled } from "@mui/material/styles";
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

// Table and its side extras (MLAG/uplink/mgmt buttons) sit side by side when
// there's horizontal room, and wrap to a stacked layout on narrow viewports.
// The table keeps a comfortable width and the extras take the leftover space;
// flex-wrap drops the extras below the table when the row can't fit.
const InfoLayout = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--size-md)",
  alignItems: "flex-start",
});

const TableCell = styled("div")({
  flex: "1 1 640px",
  minWidth: "min(100%, 640px)",
});

const ExtrasCell = styled("div")({
  flex: "1 1 auto",
});

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
    <div>
      {permissionsCheck("Devices", "write") && (
        <Dropdown
          text="Actions"
          button
          style={{ marginBottom: "var(--size-md)" }}
        >
          <Dropdown.Menu>{menuActions}</Dropdown.Menu>
        </Dropdown>
      )}
      <InfoLayout>
        <TableCell>
          <DeviceInfoTable
            device={device}
            model={model}
            netboxDevice={netboxDevice}
          />
        </TableCell>
        {deviceStateExtra && <ExtrasCell>{deviceStateExtra}</ExtrasCell>}
      </InfoLayout>
      {hasLogs && (
        <div style={{ overflow: "hidden", marginTop: "var(--size-md)" }}>
          <LogViewer logs={deviceLogs as string[]} />
        </div>
      )}
    </div>
  );
}
