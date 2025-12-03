import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";

InterfaceStatusUp.propTypes = {
  bounceInterfaceButton: PropTypes.bool,
  graphiteHtml: PropTypes.string,
  name: PropTypes.string,
  speed: PropTypes.number,
  statusMessage: PropTypes.string,
  toggleEnabled: PropTypes.bool,
};

export function InterfaceStatusUp({
  bounceInterfaceButton,
  graphiteHtml,
  name,
  speed,
  statusMessage,
  toggleEnabled,
}) {
  return (
    <Popup
      header={name}
      content={[
        <p key="status">Interface is up, speed: {speed} Mbit/s</p>,
        toggleEnabled,
        bounceInterfaceButton,
        statusMessage,
        graphiteHtml,
      ]}
      position="right center"
      wide
      hoverable
      trigger={<Icon color="green" name="circle" />}
    />
  );
}
