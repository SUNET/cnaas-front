import { type ReactNode } from "react";
import { Tooltip } from "../../../../components/Tooltip";
import CircleIcon from "@mui/icons-material/Circle";
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
    <Tooltip
      title={
        <>
          <h4 key="header">{name}</h4>
          <p key="status">Interface is up, speed: {speed} Mbit/s</p>
          {toggleEnabled}
          {bounceInterfaceButton}
          {statusMessage}
          {graphiteHtml}
        </>
      }
      placement="right"
    >
      <span>
        <CircleIcon sx={{ color: "green" }} />
      </span>
    </Tooltip>
  );
}
