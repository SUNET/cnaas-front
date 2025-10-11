import PropTypes from "prop-types";
import { Popup, Button } from "semantic-ui-react";

function LldpNeighborPopup({ lldpNeighborData }) {
  const neighborTable = [];
  lldpNeighborData.forEach((neighbor) => {
    neighborTable.push(
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
      </p>,
    );
  });
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
  // eslint-disable-next-line react/forbid-prop-types
  lldpNeighborData: PropTypes.array,
};

LldpNeighborPopup.defaultProps = {
  lldpNeighborData: [],
};

export default LldpNeighborPopup;
