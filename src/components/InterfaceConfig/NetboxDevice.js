import PropTypes from "prop-types";

export function NetboxDevice({ netboxDevice }) {
  const deviceStatus = netboxDevice?.status;

  return deviceStatus ? (
    <p>
      Netbox state:{" "}
      <a href={netboxDevice.display_url} title="Go to device in Netbox">
        {netboxDevice.status.label}
      </a>
    </p>
  ) : null;
}

NetboxDevice.propTypes = {
  netboxDevice: PropTypes.object,
};

NetboxDevice.defaultProps = {
  netboxDevice: {},
};
