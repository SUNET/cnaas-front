import { useMemo } from "react";
import { Popup, Button } from "semantic-ui-react";
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
    <Popup
      header="LLDP Neighbor Information"
      content={neighborTable}
      position="right center"
      wide
      hoverable
      trigger={<Button className="table-button-compact">N</Button>}
    />
  );
}
