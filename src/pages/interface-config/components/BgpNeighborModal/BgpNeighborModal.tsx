import { useState, useCallback } from "react";
import { Modal, Table, Header, Label, Message } from "semantic-ui-react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Tooltip } from "../../../../components/Tooltip";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import { formatISODate } from "../../../../utils/formatters";
import { fetchBgpSettings } from "../../api/settingsApi";
import { fetchBgpNeighbors } from "../../api/gnmiApi";

interface BgpNeighborModalProps {
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

interface SessionStateDetails {
  lastEstablished: string | null;
  lastNotificationCode: string | null;
  lastNotificationSubcode: string | null;
  lastNotificationTime: string | null;
}

interface BgpNeighborRow {
  neighborAddress: string;
  peerAs: number | null;
  sessionState: string;
  description: string;
  prefixes: PrefixCounts;
  afiSafi: string;
  sessionDetails: SessionStateDetails;
}

interface VrfBgpData {
  vrf: BgpVrf;
  neighbors: BgpNeighborRow[];
  error?: string;
}

export function formatNsTimestamp(ns: string | null): string {
  if (!ns || ns === "0") return "-";
  const ms = Math.floor(Number(ns) / 1e6);
  if (Number.isNaN(ms) || ms <= 0) return "-";
  return formatISODate(new Date(ms).toISOString());
}

export function parsePrefixes(
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

    const received = state?.messages?.received ?? {};
    const sessionDetails: SessionStateDetails = {
      lastEstablished: state?.["last-established"] ?? null,
      lastNotificationCode: received?.["last-notification-error-code"] ?? null,
      lastNotificationSubcode:
        received?.["last-notification-error-subcode"] ?? null,
      lastNotificationTime: received?.["last-notification-time"] ?? null,
    };

    neighbors.push({
      neighborAddress: address,
      peerAs: state?.["peer-as"] ?? null,
      sessionState: state?.["session-state"] ?? "UNKNOWN",
      description: state?.description ?? "",
      prefixes,
      afiSafi,
      sessionDetails,
    });
  }

  return neighbors;
}

export function BgpNeighborModal({
  hostname,
  managementIp,
  platform,
}: BgpNeighborModalProps) {
  const { token } = useAuthToken();
  const [open, setOpen] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    "idle" | "settings" | "neighbors" | "done"
  >("idle");
  const [loadingVrfs, setLoadingVrfs] = useState<Set<string>>(new Set());
  const [vrfData, setVrfData] = useState<VrfBgpData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadingPhase("settings");
    setError(null);
    setVrfData([]);
    setLoadingVrfs(new Set());
    try {
      // Step 1: fetch VRFs from settings, filter out vrf with name "UNDERLAY"
      const vrfs: BgpVrf[] = (await fetchBgpSettings(hostname, token)).filter(
        (v: BgpVrf) => v.name.toUpperCase() !== "UNDERLAY",
      );
      if (vrfs.length === 0) {
        setError("No BGP VRFs found in device settings.");
        setLoadingPhase("done");
        return;
      }

      // Step 2: show VRF headers with loaders, then fetch each
      setLoadingPhase("neighbors");
      const vrfNames = new Set(vrfs.map((v) => v.name));
      setLoadingVrfs(vrfNames);
      // Initialize vrfData with empty neighbors so headers render immediately
      setVrfData(vrfs.map((vrf) => ({ vrf, neighbors: [] })));

      // Fetch each VRF individually, updating state as each completes
      await Promise.all(
        vrfs.map(async (vrf) => {
          try {
            const response = await fetchBgpNeighbors(
              managementIp,
              vrf.name,
              token,
            );
            const neighbors = parseGnmiNeighbors(response);
            setVrfData((prev) =>
              prev.map((vd) =>
                vd.vrf.name === vrf.name ? { vrf, neighbors } : vd,
              ),
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch";
            setVrfData((prev) =>
              prev.map((vd) =>
                vd.vrf.name === vrf.name
                  ? { vrf, neighbors: [], error: msg }
                  : vd,
              ),
            );
          } finally {
            setLoadingVrfs((prev) => {
              const next = new Set(prev);
              next.delete(vrf.name);
              return next;
            });
          }
        }),
      );

      setLoadingPhase("done");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch BGP data";
      setError(msg);
      setLoadingPhase("done");
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

  const stripOcPrefix = (s: string | null) => {
    if (!s) return null;
    // e.g. "openconfig-bgp-types:CEASE" -> "CEASE"
    const idx = s.lastIndexOf(":");
    return idx >= 0 ? s.substring(idx + 1) : s;
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
        <Button
          variant="contained"
          endIcon={<SwapHorizIcon />}
          onClick={handleOpen}
        >
          BGP Neighbors
        </Button>
      }
    >
      <Modal.Header>
        BGP Neighbors — {hostname} ({managementIp} - {platform})
      </Modal.Header>
      <Modal.Content scrolling>
        {loadingPhase === "settings" && (
          <p>
            <CircularProgress size="1em" /> Fetching VRF settings...
          </p>
        )}

        {error && <Message negative>{error}</Message>}

        {loadingPhase === "done" && !error && vrfData.length === 0 && (
          <Message info>No BGP data loaded yet.</Message>
        )}

        {vrfData.map((vd) => (
          <div key={vd.vrf.name} style={{ marginBottom: "2em" }}>
            <Header as="h3">
              VRF: {vd.vrf.name}
              <Header.Subheader>Local AS: {vd.vrf.local_as}</Header.Subheader>
            </Header>

            {loadingVrfs.has(vd.vrf.name) ? (
              <p>
                <CircularProgress size="1em" /> Fetching BGP neighbors...
              </p>
            ) : vd.error ? (
              <Message warning>
                Error fetching neighbors for {vd.vrf.name}: {vd.error}
              </Message>
            ) : vd.neighbors.length === 0 ? (
              <Message>No BGP neighbors found in this VRF.</Message>
            ) : (
              <Table compact celled structured>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Neighbor</Table.HeaderCell>
                    <Table.HeaderCell>Description</Table.HeaderCell>
                    <Table.HeaderCell>Peer AS</Table.HeaderCell>
                    <Table.HeaderCell>Session State</Table.HeaderCell>
                    <Table.HeaderCell>AFI</Table.HeaderCell>
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
                        <Tooltip
                          placement="right"
                          title={
                            <div>
                              <p>
                                <strong>Last established:</strong>{" "}
                                {formatNsTimestamp(
                                  n.sessionDetails.lastEstablished,
                                )}
                              </p>
                              {n.sessionDetails.lastNotificationCode && (
                                <>
                                  <p>
                                    <strong>Last notification:</strong>{" "}
                                    {stripOcPrefix(
                                      n.sessionDetails.lastNotificationCode,
                                    )}
                                    {n.sessionDetails.lastNotificationSubcode &&
                                      ` / ${stripOcPrefix(n.sessionDetails.lastNotificationSubcode)}`}
                                  </p>
                                  <p>
                                    <strong>Notification time:</strong>{" "}
                                    {formatNsTimestamp(
                                      n.sessionDetails.lastNotificationTime,
                                    )}
                                  </p>
                                </>
                              )}
                            </div>
                          }
                        >
                          <Label
                            color={sessionStateColor(n.sessionState)}
                            size="small"
                            style={{ cursor: "pointer" }}
                          >
                            {n.sessionState}
                          </Label>
                        </Tooltip>
                      </Table.Cell>
                      <Table.Cell>{n.afiSafi || "-"}</Table.Cell>
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
            )}
          </div>
        ))}
      </Modal.Content>
      <Modal.Actions>
        <Button
          variant="contained"
          onClick={loadData}
          disabled={loadingPhase === "settings" || loadingPhase === "neighbors"}
          startIcon={<RefreshIcon />}
        >
          Refresh
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => setOpen(false)}
        >
          Close
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
