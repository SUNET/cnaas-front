import { Button } from "semantic-ui-react";

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
        .filter((intf) => intf.configtype === "MLAG_PEER" && intf.data !== null)
        .map((intf) => (
          <Button
            compact
            icon="exchange"
            key={intf.name}
            onClick={() => {
              handleFilterChange(
                { id: String(intf.data?.neighbor_id ?? "") },
                intf.data?.neighbor_id ?? null,
              );
              globalThis.scrollTo(0, 0);
            }}
            title="Go to MLAG peer device"
            content={`${intf.name}: MLAG peer`}
          />
        ))}
    </>
  );
}
