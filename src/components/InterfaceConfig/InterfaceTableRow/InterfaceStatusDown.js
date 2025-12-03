import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";

InterfaceStatusDown.propTypes = {
  bounceInterfaceButton: PropTypes.bool,
  graphiteHtml: PropTypes.string,
  name: PropTypes.string,
  statusMessage: PropTypes.string,
  toggleEnabled: PropTypes.bool,
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
