import Button from "@mui/material/Button";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { useDeviceListPageActions } from "../stores/DeviceListContext";
import type { DeviceInterface } from "../types/deviceInterface";

type MlagButtonsProps = {
  readonly interfaces: readonly DeviceInterface[];
};

/**
 * Per-interface buttons for MLAG peers. Clicking jumps to the peer
 * device via the page-level filter handler.
 */
export function MlagButtons({ interfaces }: MlagButtonsProps) {
  const { handleFilterChange } = useDeviceListPageActions();

  return (
    <>
      {interfaces
        .filter(
          (intf) =>
            intf.configtype === "MLAG_PEER" &&
            intf.data != null &&
            typeof intf.data.neighbor_id === "number",
        )
        .map((intf) => (
          <Button
            size="small"
            variant="contained"
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
    </>
  );
}
