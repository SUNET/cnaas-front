import Button from "@mui/material/Button";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

import { useDeviceListPageActions } from "../stores/DeviceListContext";
import type { DeviceInterface } from "../types/deviceInterface";

type UplinkButtonsProps = {
  readonly interfaces: readonly DeviceInterface[];
};

/**
 * Per-interface buttons for ACCESS uplinks. Clicking jumps to the
 * neighbour device via the page-level filter handler.
 */
export function UplinkButtons({ interfaces }: UplinkButtonsProps) {
  const { handleFilterChange } = useDeviceListPageActions();

  return (
    <>
      {interfaces
        .filter(
          (intf) =>
            intf.configtype === "ACCESS_UPLINK" &&
            intf.data != null &&
            typeof intf.data.neighbor === "string" &&
            intf.data.neighbor.length > 0,
        )
        .map((intf) => (
          <Button
            size="small"
            variant="contained"
            startIcon={<ArrowUpwardIcon />}
            sx={{ justifyContent: "flex-start" }}
            key={intf.name}
            onClick={() => {
              handleFilterChange(
                { hostname: intf.data?.neighbor ?? "" },
                typeof intf.data?.neighbor_id === "number"
                  ? intf.data.neighbor_id
                  : null,
              );
              globalThis.scrollTo(0, 0);
            }}
            title="Go to uplink device"
          >
            {`${intf.name}: Uplink to ${intf.data?.neighbor}`}
          </Button>
        ))}
    </>
  );
}
