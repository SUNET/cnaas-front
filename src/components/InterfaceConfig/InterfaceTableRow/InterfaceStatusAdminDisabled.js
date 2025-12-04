import PropTypes from "prop-types";
import { Icon, Popup } from "semantic-ui-react";
import { GraphiteInterface } from "./GraphiteInterface";

InterfaceStatusAdminDisabled.propTypes = {
  hostname: PropTypes.string,
  name: PropTypes.string,
  toggleEnabled: PropTypes.bool,
};

export function InterfaceStatusAdminDisabled({
  hostname,
  name,
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
