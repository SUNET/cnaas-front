import PropTypes from "prop-types";
import { useMemo } from "react";
import { Popup, Button } from "semantic-ui-react";

function NeighborInfo({ neighbor }) {
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

export function LldpNeighborPopup({ lldpNeighborData }) {
  const neighborTable = useMemo(
    () =>
      lldpNeighborData.map((neigh, idx) => (
        <NeighborInfo key={`lldap_neigh_${idx}`} neighbor={neigh} />
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

LldpNeighborPopup.propTypes = {
  lldpNeighborData: PropTypes.array,
};

LldpNeighborPopup.defaultProps = {
  lldpNeighborData: [],
};
