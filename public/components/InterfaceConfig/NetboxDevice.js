import PropTypes from "prop-types";

function NetboxDevice({ netboxDevice }) {
  // if netboxData is empty object. return null
  if (Object.keys(netboxDevice).length === 0) {
    return null;
  }
  return (
    <p>
      Netbox state:{" "}
      <a href={netboxDevice.display_url} title="Go to device in Netbox">
        {netboxDevice.status.label}
      </a>
    </p>
  );
}

NetboxDevice.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  netboxDevice: PropTypes.object,
};

NetboxDevice.defaultProps = {
  netboxDevice: {},
};

export default NetboxDevice;
