import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";
import { GraphiteInterface } from "./GraphiteInterface";

InterfaceStatusUp.propTypes = {
  bounceInterfaceButton: PropTypes.object,
  hostname: PropTypes.string,
  name: PropTypes.string,
  speed: PropTypes.number,
  statusMessage: PropTypes.string,
  toggleEnabled: PropTypes.object,
};

export function InterfaceStatusUp({
  bounceInterfaceButton,
  hostname,
  name,
  speed,
  statusMessage,
  toggleEnabled,
}) {
  const graphiteHtml = (
    <GraphiteInterface
      key="graphite"
      hostname={hostname}
      interfaceName={name}
    />
  );

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
