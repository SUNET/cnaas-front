import { Button } from "semantic-ui-react";

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
          (intf) => intf.configtype === "ACCESS_UPLINK" && intf.data !== null,
        )
        .map((intf) => (
          <Button
            compact
            icon="arrow up"
            key={intf.name}
            onClick={() => {
              handleFilterChange(
                { hostname: intf.data?.neighbor ?? "" },
                intf.data?.neighbor_id ?? null,
              );
              globalThis.scrollTo(0, 0);
            }}
            title="Go to uplink device"
            content={`${intf.name}: Uplink to ${intf.data?.neighbor}`}
          />
        ))}
    </>
  );
}
