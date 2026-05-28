import { type ReactNode } from "react";
import { Icon, Popup } from "semantic-ui-react";
import { GraphiteInterface } from "../../../../components/GraphiteInterface";

export function InterfaceStatusUp({
  bounceInterfaceButton,
  hostname,
  name,
  speed,
  statusMessage,
  toggleEnabled,
}: {
  readonly bounceInterfaceButton: ReactNode;
  readonly hostname: string | null;
  readonly name: string;
  readonly speed: number | undefined;
  readonly statusMessage: ReactNode;
  readonly toggleEnabled: ReactNode;
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
