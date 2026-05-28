import { type ReactNode } from "react";
import { Icon, Popup } from "semantic-ui-react";
import { GraphiteInterface } from "../../../../components/GraphiteInterface";

export function InterfaceStatusDown({
  bounceInterfaceButton,
  hostname,
  name,
  statusMessage,
  toggleEnabled,
}: {
  readonly bounceInterfaceButton: ReactNode;
  readonly hostname: string | null;
  readonly name: string;
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
