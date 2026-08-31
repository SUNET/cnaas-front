import { type ReactNode } from "react";
import { NmsTooltip } from "../../../../components/NmsTooltip";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
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
    <NmsTooltip
      title={
        <>
          <h4 key="header">{name}</h4>
          <p key="status">Interface is down</p>
          {toggleEnabled}
          {bounceInterfaceButton}
          {statusMessage}
          {graphiteHtml}
        </>
      }
      placement="right"
    >
      <span>
        <RadioButtonUncheckedIcon sx={{ color: "grey" }} />
      </span>
    </NmsTooltip>
  );
}
