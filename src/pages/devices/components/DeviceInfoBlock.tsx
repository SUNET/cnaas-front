import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import { styled } from "@mui/material/styles";
import { useState, type MouseEvent, type ReactNode } from "react";

import { DeviceInfoTable } from "../../../components/DeviceInfoTable";
import LogViewer from "../../../components/LogViewer";
import { usePermissions } from "../../../stores/PermissionsContext";
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
// there's horizontal room, and stack on narrow viewports. Using grid tracks
// (rather than flex) means each column's width is capped by its own track
// definition - `minmax(0, ...)` overrides the browser's implicit
// min-width/min-content floor, so wide content in the extras column (e.g.
// DeviceInitForm's fields) is clipped/wrapped within its own column instead
// of growing the whole row and pushing the table.
const InfoLayout = styled("div", {
  shouldForwardProp: (prop) => prop !== "hasExtra",
})<{ hasExtra: boolean }>(({ theme, hasExtra }) => ({
  display: "grid",
  gridTemplateColumns: hasExtra ? "minmax(0, 640px) minmax(0, 640px)" : "1fr",
  gap: theme.spacing(2),
  alignItems: "start",
  [theme.breakpoints.down("md")]: {
    gridTemplateColumns: "1fr",
  },
}));

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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      {permissionsCheck("Devices", "write") && (
        <>
          <Button
            id="device-actions-button"
            aria-controls={menuOpen ? "device-actions-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
            onClick={handleMenuOpen}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Actions
          </Button>
          <Menu
            id="device-actions-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            slotProps={{ list: { "aria-labelledby": "device-actions-button" } }}
          >
            {menuActions}
          </Menu>
        </>
      )}
      <InfoLayout hasExtra={Boolean(deviceStateExtra)}>
        <Box>
          <DeviceInfoTable
            device={device}
            model={model}
            netboxDevice={netboxDevice}
          />
        </Box>
        {deviceStateExtra && <Box>{deviceStateExtra}</Box>}
      </InfoLayout>
      {hasLogs && (
        <Box sx={{ overflow: "hidden", mt: 2 }}>
          <LogViewer logs={deviceLogs as string[]} />
        </Box>
      )}
    </div>
  );
}
