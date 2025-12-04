import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";

InterfaceStatusDown.propTypes = {
  bounceInterfaceButton: PropTypes.object,
  graphiteHtml: PropTypes.object,
  name: PropTypes.string,
  statusMessage: PropTypes.string,
  toggleEnabled: PropTypes.object,
};

export function InterfaceStatusDown({
  bounceInterfaceButton,
  graphiteHtml,
  name,
  statusMessage,
  toggleEnabled,
}) {
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
