import { type ReactNode } from "react";
import { NmsTooltip } from "../../../../components/NmsTooltip";
import CircleIcon from "@mui/icons-material/Circle";
import { GraphiteInterface } from "../../../../components/GraphiteInterface";

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
    <NmsTooltip
      title={
        <>
          <h4 key="header">{name}</h4>
          <p key="status">Interface is admin disabled</p>
          {toggleEnabled}
          {graphiteHtml}
        </>
      }
      placement="right"
    >
      <span>
        <CircleIcon sx={{ color: "red" }} />
      </span>
    </NmsTooltip>
  );
}
