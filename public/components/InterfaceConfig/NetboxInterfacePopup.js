import PropTypes from "prop-types";
import React from "react";
import { Popup, Button } from "semantic-ui-react";

function NetboxInterfacePopup({ netboxInterface }) {
  // if netboxData is empty object. return null
  if (Object.keys(netboxInterface).length === 0) {
    return null;
  }
  let interfaceType = null;
  // if netboxInterface object has key type, return interface type
  if (netboxInterface.type !== null) {
    interfaceType = (
      <p key="type">Interface type: {netboxInterface.type.label}</p>
    );
  }
  let cableInfo = null;
  // if netboxInterface object has key cable, return cable info
  if (netboxInterface.cable !== null) {
    cableInfo = <p key="cable">Cable: {netboxInterface.cable.display}</p>;
  }
  const neighborInfo = [];
  try {
    // for each neighbor in netboxInterface.connected_endpoints, return neighbor info
    if (Array.isArray(netboxInterface.connected_endpoints)) {
      netboxInterface.connected_endpoints.forEach((neighbor) => {
        neighborInfo.push(
          <p key={neighbor.device.name}>
            Neighbor:{" "}
            <a
              href={neighbor.device.url.replace("/api", "")}
              target="_blank"
              rel="noreferrer"
            >
              {neighbor.device.name}
            </a>{" "}
            <a
              href={neighbor.url.replace("/api", "")}
              target="_blank"
              rel="noreferrer"
            >
              {neighbor.name}
            </a>{" "}
            <a
              href={`${neighbor.url.replace("/api", "")}trace/`}
              target="_blank"
              rel="noreferrer"
            >
              Trace cable
            </a>
          </p>,
        );
      });
    }
  } catch (error) {
    console.log(error);
  }
  return (
    <Popup
      header="Inventory Information"
      content={[interfaceType, cableInfo, neighborInfo]}
      position="right center"
      wide
      hoverable
      trigger={<Button className="table-button-compact">I</Button>}
    />
  );
}

NetboxInterfacePopup.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  netboxInterface: PropTypes.object,
};

NetboxInterfacePopup.defaultProps = {
  netboxInterface: {},
};

export default NetboxInterfacePopup;
