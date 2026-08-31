import { useMemo } from "react";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import type { LldpNeighbor } from "../../types/lldp";

function NeighborInfo({ neighbor }: { readonly neighbor: LldpNeighbor }) {
  return (
    <p>
      Neighbor: {neighbor.remote_system_name || neighbor.remote_chassis_id}
      <br />
      Port: {neighbor.remote_port}
      <br />
      Port Description: {neighbor.remote_port_description}
      <br />
      System Description: {neighbor.remote_system_description}
      <br />
      System Capabilities: {neighbor.remote_system_capab}
      <br />
    </p>
  );
}

export function LldpNeighborPopup({
  lldpNeighborData = [],
}: {
  readonly lldpNeighborData?: LldpNeighbor[];
}) {
  const neighborTable = useMemo(
    () =>
      lldpNeighborData.map((neigh) => (
        <NeighborInfo
          key={`lldp_neigh_${neigh.remote_chassis_id}_${neigh.remote_port}`}
          neighbor={neigh}
        />
      )),
    [lldpNeighborData],
  );

  return (
    <Tooltip
      title={
        <>
          <h4>LLDP Neighbor Information</h4>
          {neighborTable}
        </>
      }
      placement="right"
      slotProps={{ tooltip: { sx: { maxWidth: "none" } } }}
    >
      <span>
        <Button size="small" sx={{ minWidth: 0 }}>
          N
        </Button>
      </span>
    </Tooltip>
  );
}
