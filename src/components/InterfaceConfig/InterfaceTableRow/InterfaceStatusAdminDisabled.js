import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";

InterfaceStatusAdminDisabled.propTypes = {
  name: PropTypes.string,
  toggleEnabled: PropTypes.bool,
  graphiteHtml: PropTypes.string,
};

export function InterfaceStatusAdminDisabled({
  name,
  toggleEnabled,
  graphiteHtml,
}) {
  return (
    <Popup
      header={name}
      content={[
        <p key="status">Interface is admin disabled</p>,
        toggleEnabled,
        graphiteHtml,
      ]}
      position="right center"
      wide
      hoverable
      trigger={<Icon color="red" name="circle" />}
    />
  );
}
