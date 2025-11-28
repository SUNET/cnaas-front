import {
  Icon,
  Popup,
} from "semantic-ui-react";

export function InterfaceStatusUp({
  name,
  speed,
  toggleEnabled,
  bounceInterfaceButton,
  statusMessage,
  graphiteHtml,
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
