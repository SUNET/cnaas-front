import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

import type { Device } from "../../../types/device";
import { useDeviceList } from "../stores/DeviceListContext";
import { useDeviceListActions } from "../hooks/useDeviceListActions";

type MgmtDomainButtonProps = {
  readonly device: Device;
};

/**
 * Management-domain widget for DIST/CORE devices.
 *
 * If the device already participates in a mgmt domain, renders a button
 * that opens the update modal. Otherwise, finds eligible peer candidates
 * (same type, no existing mgmt domain) and renders an "Add" button.
 *
 * Throws if a device somehow belongs to more than one mgmt domain — that
 * shouldn't happen and signals a backend invariant violation.
 */
export function MgmtDomainButton({ device }: MgmtDomainButtonProps) {
  const { state } = useDeviceList();
  const { handleMgmtAddModalOpen, handleMgmtUpdateModalOpen } =
    useDeviceListActions();
  const { deviceData, mgmtDomainsData } = state;

  const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
  const owned = mgmtDomainsData.filter(
    (data) =>
      device.hostname === data.device_a || device.hostname === data.device_b,
  );

  if (owned.length === 0) {
    // Same-type peering: a DIST pairs with DIST, a CORE with CORE.
    // CORE pairing is gated by MGMT_DOMAIN_CORE_ENABLED.
    const isEligiblePeer = (d: Device) =>
      d.device_type === device.device_type &&
      (device.device_type === "DIST" ||
        (includeCore && device.device_type === "CORE"));
    const candidates = deviceData
      .filter(isEligiblePeer)
      .filter((d) => d.id !== device.id)
      .filter(
        (d) =>
          !mgmtDomainsData.some(
            (m) => d.hostname === m.device_a || d.hostname === m.device_b,
          ),
      );
    return (
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ justifyContent: "flex-start" }}
        key={`${device.id}_mgmgt_add`}
        onClick={() => handleMgmtAddModalOpen(device.hostname, [...candidates])}
      >
        Add management domain
      </Button>
    );
  }

  if (owned.length > 1) {
    throw new Error("multiple mgmt domains for device");
  }

  return (
    <Button
      variant="contained"
      startIcon={<ArrowUpwardIcon />}
      sx={{ justifyContent: "flex-start" }}
      key={`${device.id}_mgmgt_add`}
      onClick={() => handleMgmtUpdateModalOpen(owned[0])}
    >
      Management domain
    </Button>
  );
}
