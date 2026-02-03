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

NeighborInfo.propTypes = {
  neighbor: PropTypes.shape({
    remote_system_name: PropTypes.string,
    remote_chassis_id: PropTypes.string,
    remote_port: PropTypes.string,
    remote_port_description: PropTypes.string,
    remote_system_description: PropTypes.string,
    remote_system_capab: PropTypes.array,
  }),
};

export function LldpNeighborPopup({ lldpNeighborData }) {
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

LldpNeighborPopup.propTypes = {
  lldpNeighborData: PropTypes.arrayOf(
    PropTypes.shape({
      remote_system_name: PropTypes.string,
      remote_chassis_id: PropTypes.string,
      remote_port: PropTypes.string,
      remote_port_description: PropTypes.string,
      remote_system_description: PropTypes.string,
      remote_system_capab: PropTypes.array,
    }),
  ),
};

LldpNeighborPopup.defaultProps = {
  lldpNeighborData: [],
};
