import { type ReactNode } from "react";
import { Icon, Popup } from "semantic-ui-react";
import { GraphiteInterface } from "./GraphiteInterface";

export function InterfaceStatusAdminDisabled({
  hostname,
  name,
  toggleEnabled,
}: {
  readonly hostname: string | null;
  readonly name: string;
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
