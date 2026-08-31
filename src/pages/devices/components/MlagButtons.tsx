import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { useDeviceListPageActions } from "../stores/DeviceListContext";
import type { DeviceInterface } from "../types/deviceInterface";

type MlagButtonsProps = {
  readonly interfaces: readonly DeviceInterface[];
};

/**
 * Per-interface buttons for MLAG peers, joined into one button group.
 * Clicking jumps to the peer device via the page-level filter handler.
 */
export function MlagButtons({ interfaces }: MlagButtonsProps) {
  const { handleFilterChange } = useDeviceListPageActions();

  const mlagInterfaces = interfaces.filter(
    (intf) =>
      intf.configtype === "MLAG_PEER" &&
      intf.data != null &&
      typeof intf.data.neighbor_id === "number",
  );

  if (mlagInterfaces.length === 0) return null;

  return (
    <ButtonGroup orientation="vertical" variant="contained">
      {mlagInterfaces.map((intf) => (
        <Button
          startIcon={<SwapHorizIcon />}
          sx={{ justifyContent: "flex-start" }}
          key={intf.name}
          onClick={() => {
            handleFilterChange(
              { id: String(intf.data?.neighbor_id ?? "") },
              intf.data?.neighbor_id ?? null,
            );
            globalThis.scrollTo(0, 0);
          }}
          title="Go to MLAG peer device"
        >
          {`${intf.name}: MLAG peer`}
        </Button>
      ))}
    </ButtonGroup>
  );
}
