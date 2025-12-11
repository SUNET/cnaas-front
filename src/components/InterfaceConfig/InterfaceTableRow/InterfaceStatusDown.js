import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";
import { GraphiteInterface } from "./GraphiteInterface";

InterfaceStatusDown.propTypes = {
  bounceInterfaceButton: PropTypes.object,
  hostname: PropTypes.string,
  name: PropTypes.string,
  statusMessage: PropTypes.object,
  toggleEnabled: PropTypes.object,
};

export function InterfaceStatusDown({
  bounceInterfaceButton,
  hostname,
  name,
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
        <p key="status">Interface is down</p>,
        toggleEnabled,
        bounceInterfaceButton,
        statusMessage,
        graphiteHtml,
      ]}
      position="right center"
      wide
      hoverable
      trigger={<Icon color="grey" name="circle outline" />}
    />
  );
}
