import { useState, useCallback } from "react";
import {
  Button,
  Icon,
  Modal,
  Loader,
  Table,
  Header,
  Label,
  Message,
} from "semantic-ui-react";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { fetchBgpSettings, fetchBgpNeighbors } from "../../services/deviceApi";

interface BgpNeighborModalProps {
  readonly deviceId: number;
  readonly hostname: string;
  readonly managementIp: string;
  readonly platform: string;
}

interface BgpVrf {
  name: string;
  local_as: number;
  neighbor_v4: string[];
  neighbor_v6: string[];
}

interface PrefixCounts {
  active: boolean | null;
  installed: number | null;
  received: number | null;
  receivedPrePolicy: number | null;
  sent: number | null;
}

interface BgpNeighborRow {
  neighborAddress: string;
  peerAs: number | null;
  sessionState: string;
  description: string;
  prefixes: PrefixCounts;
  afiSafi: string;
}

interface VrfBgpData {
  vrf: BgpVrf;
  neighbors: BgpNeighborRow[];
  error?: string;
}

function parsePrefixes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afiSafiList: any[],
): { prefixes: PrefixCounts; afiSafi: string } {
  const defaultPrefixes: PrefixCounts = {
    active: null,
    installed: null,
    received: null,
    receivedPrePolicy: null,
    sent: null,
  };

  if (!Array.isArray(afiSafiList)) {
    return { prefixes: defaultPrefixes, afiSafi: "" };
  }

  // Find the active afi-safi (IPv4 or IPv6) — prefer the one with active: true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallback: { prefixes: PrefixCounts; afiSafi: string } | null = null;

  for (const afi of afiSafiList) {
    const afiName: string =
      afi["afi-safi-name"] ?? afi?.config?.["afi-safi-name"] ?? "";
    if (
      !afiName.includes("IPV4_UNICAST") &&
      !afiName.includes("IPV6_UNICAST")
    ) {
      continue;
    }
    const state = afi?.state ?? {};
    const pfx = state?.prefixes ?? {};
    const entry = {
      prefixes: {
        active: pfx?.active ?? state?.active ?? null,
        installed: pfx?.installed ?? null,
        received: pfx?.received ?? null,
        receivedPrePolicy: pfx?.["received-pre-policy"] ?? null,
        sent: pfx?.sent ?? null,
      },
      afiSafi: afiName.includes("IPV4_UNICAST") ? "IPv4" : "IPv6",
    };
    // Return immediately if this AFI is active
    if (state?.active === true) {
      return entry;
    }
    // Otherwise keep as fallback
    if (!fallback) {
      fallback = entry;
    }
  }

  return fallback ?? { prefixes: defaultPrefixes, afiSafi: "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseGnmiNeighbors(gnmiResponse: any): BgpNeighborRow[] {
  // The gNMI response structure can vary; try common paths
  const neighbors: BgpNeighborRow[] = [];

  // The gNMI response may be nested under result.<path-key>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = gnmiResponse;

  // Unwrap "result" envelope if present
  if (data?.result && typeof data.result === "object") {
    // result is keyed by the gNMI path string; grab the first value
    const values = Object.values(data.result);
    if (values.length > 0) {
      data = values[0];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let neighborList: any[] = [];

  if (data?.["openconfig-network-instance:neighbor"]) {
    neighborList = data["openconfig-network-instance:neighbor"];
  } else if (data?.["openconfig-network-instance:neighbors"]?.neighbor) {
    neighborList = data["openconfig-network-instance:neighbors"].neighbor;
  } else if (data?.neighbor) {
    neighborList = data.neighbor;
  } else if (Array.isArray(data)) {
    neighborList = data;
  }

  for (const n of neighborList) {
    const address: string =
      n["neighbor-address"] ?? n?.config?.["neighbor-address"] ?? "unknown";
    const state = n?.state ?? {};
    const afiSafis = n?.["afi-safis"]?.["afi-safi"] ?? n?.["afi-safis"] ?? [];
    const { prefixes, afiSafi } = parsePrefixes(afiSafis);

    neighbors.push({
      neighborAddress: address,
      peerAs: state?.["peer-as"] ?? null,
      sessionState: state?.["session-state"] ?? "UNKNOWN",
      description: state?.description ?? "",
      prefixes,
      afiSafi,
    });
  }

  return neighbors;
}

export function BgpNeighborModal({
  deviceId,
  hostname,
  managementIp,
  platform,
}: BgpNeighborModalProps) {
  const { token } = useAuthToken();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vrfData, setVrfData] = useState<VrfBgpData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVrfData([]);
    try {
      // Step 1: fetch VRFs from settings
      const vrfs: BgpVrf[] = await fetchBgpSettings(hostname, token);
      if (vrfs.length === 0) {
        setError("No BGP VRFs found in device settings.");
        return;
      }

      // Step 2: for each VRF, fetch BGP neighbors via gNMI
      const results = await Promise.all(
        vrfs.map(async (vrf): Promise<VrfBgpData> => {
          try {
            const response = await fetchBgpNeighbors(
              managementIp,
              vrf.name,
              token,
            );
            const neighbors = parseGnmiNeighbors(response);
            return { vrf, neighbors };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch";
            return { vrf, neighbors: [], error: msg };
          }
        }),
      );

      setVrfData(results);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch BGP data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [hostname, managementIp, token]);

  const handleOpen = () => {
    setOpen(true);
    loadData();
  };

  const sessionStateColor = (state: string) => {
    if (state === "ESTABLISHED") return "green";
    if (
      state === "ACTIVE" ||
      state === "CONNECT" ||
      state === "OPENSENT" ||
      state === "OPENCONFIRM"
    )
      return "yellow";
    return "red";
  };

  const renderValue = (v: number | boolean | null) => {
    if (v === null || v === undefined) return "-";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="fullscreen"
      trigger={
        <Button icon labelPosition="right" onClick={handleOpen}>
          BGP Neighbors
          <Icon name="exchange" />
        </Button>
      }
    >
      <Modal.Header>
        BGP Neighbors — {hostname} ({managementIp})
      </Modal.Header>
      <Modal.Content scrolling>
        {loading && (
          <Loader active inline="centered" content="Loading BGP neighbors..." />
        )}

        {error && <Message negative>{error}</Message>}

        {!loading && !error && vrfData.length === 0 && (
          <Message info>No BGP data loaded yet.</Message>
        )}

        {vrfData.map((vd) => (
          <div key={vd.vrf.name} style={{ marginBottom: "2em" }}>
            <Header as="h3">
              VRF: {vd.vrf.name}
              <Header.Subheader>Local AS: {vd.vrf.local_as}</Header.Subheader>
            </Header>

            {vd.error && (
              <Message warning>
                Error fetching neighbors for {vd.vrf.name}: {vd.error}
              </Message>
            )}

            {vd.neighbors.length === 0 && !vd.error ? (
              <Message>No BGP neighbors found in this VRF.</Message>
            ) : vd.neighbors.length > 0 ? (
              <Table compact celled structured>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Neighbor</Table.HeaderCell>
                    <Table.HeaderCell>Description</Table.HeaderCell>
                    <Table.HeaderCell>Peer AS</Table.HeaderCell>
                    <Table.HeaderCell>Session State</Table.HeaderCell>
                    <Table.HeaderCell>AFI</Table.HeaderCell>
                    <Table.HeaderCell>Active</Table.HeaderCell>
                    <Table.HeaderCell>Installed</Table.HeaderCell>
                    <Table.HeaderCell>Received</Table.HeaderCell>
                    <Table.HeaderCell>Recv Pre-Policy</Table.HeaderCell>
                    <Table.HeaderCell>Sent</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {vd.neighbors.map((n) => (
                    <Table.Row key={n.neighborAddress}>
                      <Table.Cell>{n.neighborAddress}</Table.Cell>
                      <Table.Cell>{n.description}</Table.Cell>
                      <Table.Cell>{renderValue(n.peerAs)}</Table.Cell>
                      <Table.Cell>
                        <Label
                          color={sessionStateColor(n.sessionState)}
                          size="small"
                        >
                          {n.sessionState}
                        </Label>
                      </Table.Cell>
                      <Table.Cell>{n.afiSafi || "-"}</Table.Cell>
                      <Table.Cell>{renderValue(n.prefixes.active)}</Table.Cell>
                      <Table.Cell>
                        {renderValue(n.prefixes.installed)}
                      </Table.Cell>
                      <Table.Cell>
                        {renderValue(n.prefixes.received)}
                      </Table.Cell>
                      <Table.Cell>
                        {renderValue(n.prefixes.receivedPrePolicy)}
                      </Table.Cell>
                      <Table.Cell>{renderValue(n.prefixes.sent)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            ) : null}
          </div>
        ))}

        <p>
          <strong>Device ID:</strong> {deviceId} | <strong>Platform:</strong>{" "}
          {platform}
        </p>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={loadData} disabled={loading}>
          <Icon name="refresh" />
          Refresh
        </Button>
        <Button color="black" onClick={() => setOpen(false)}>
          Close
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
