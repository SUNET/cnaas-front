import PropTypes from "prop-types";
import { useMemo } from "react";
import { Popup, Button } from "semantic-ui-react";

function InterfaceType({ type }) {
  if (!type) return null;
  return <p>Interface type: {type.label}</p>;
}

function CableInfo({ cable }) {
  if (!cable) return null;
  return <p>Cable: {cable.display}</p>;
}

function NeighborInfoList({ neighbors }) {
  if (!Array.isArray(neighbors)) return null;

  return neighbors.map((neighbor) => (
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
    </p>
  ));
}

export function NetboxInterfacePopup({ netboxInterface }) {
  const content = useMemo(() => {
    const { type, cable, connected_endpoints } = netboxInterface;

    return (
      <>
        <InterfaceType type={type} />
        <CableInfo cable={cable} />
        <NeighborInfoList neighbors={connected_endpoints} />
      </>
    );
  }, [netboxInterface]);

  if (Object.keys(netboxInterface).length === 0) {
    return null;
  }

  return (
    <Popup
      header="Inventory Information"
      content={content}
      position="right center"
      wide
      hoverable
      trigger={<Button className="table-button-compact">I</Button>}
    />
  );
}

NetboxInterfacePopup.propTypes = {
  netboxInterface: PropTypes.object,
};

NetboxInterfacePopup.defaultProps = {
  netboxInterface: {},
};

export default NetboxInterfacePopup;
