import { useMemo } from "react";
import { NmsTooltip } from "../../../../components/NmsTooltip";
import Button from "@mui/material/Button";

type NetboxType = { readonly label?: string };
type NetboxCable = { readonly display?: string };
type NetboxNeighbor = {
  readonly device: { readonly name: string; readonly url: string };
  readonly url: string;
  readonly name: string;
};
type NetboxInterface = {
  readonly type?: NetboxType;
  readonly cable?: NetboxCable;
  readonly connected_endpoints?: NetboxNeighbor[];
};

function InterfaceType({ type }: { readonly type: NetboxType | undefined }) {
  if (!type) return null;
  return <p>Interface type: {type.label}</p>;
}

function CableInfo({ cable }: { readonly cable: NetboxCable | undefined }) {
  if (!cable) return null;
  return <p>Cable: {cable.display}</p>;
}

function NeighborInfoList({
  neighbors,
}: {
  readonly neighbors: NetboxNeighbor[] | undefined;
}) {
  if (!Array.isArray(neighbors)) return null;

  return neighbors.map((neighbor) => (
    <p key={`${neighbor.device.name}-${neighbor.name}`}>
      Neighbor:{" "}
      <a
        href={neighbor.device.url.replace("/api", "")}
        target="_blank"
        rel="noreferrer"
      >
        {neighbor.device.name}
      </a>{" "}
      <a
        href={neighbor.url.replace("/api", "")}
        target="_blank"
        rel="noreferrer"
      >
        {neighbor.name}
      </a>{" "}
      <a
        href={`${neighbor.url.replace("/api", "")}trace/`}
        target="_blank"
        rel="noreferrer"
      >
        Trace cable
      </a>
    </p>
  ));
}

export function NetboxInterfacePopup({
  netboxInterface = {},
}: {
  readonly netboxInterface?: NetboxInterface;
}) {
  const content = useMemo(() => {
    const {
      type,
      cable,
      connected_endpoints: connectedEndpoints,
    } = netboxInterface;

    return (
      <>
        <h4>Inventory Information</h4>
        <InterfaceType type={type} />
        <CableInfo cable={cable} />
        <NeighborInfoList neighbors={connectedEndpoints} />
      </>
    );
  }, [netboxInterface]);

  if (Object.keys(netboxInterface).length === 0) {
    return null;
  }

  return (
    <NmsTooltip title={content} placement="right">
      <span>
        <Button size="small" sx={{ minWidth: 0 }}>
          I
        </Button>
      </span>
    </NmsTooltip>
  );
}
