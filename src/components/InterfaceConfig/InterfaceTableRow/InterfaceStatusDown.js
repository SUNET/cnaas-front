import { Icon, Popup } from "semantic-ui-react";

export function InterfaceStatusDown({
  name,
  toggleEnabled,
  bounceInterfaceButton,
  statusMessage,
  graphiteHtml,
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
