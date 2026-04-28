import {
  parseGnmiNeighbors,
  parsePrefixes,
  formatNsTimestamp,
} from "./BgpNeighborModal";

// --- Sample data based on real Arista EOS gNMI response ---

function makeNeighborEntry(overrides: Record<string, unknown> = {}) {
  return {
    "neighbor-address": "10.0.0.1",
    config: {
      description: "peer1",
      "neighbor-address": "10.0.0.1",
      "peer-as": 64500,
    },
    state: {
      description: "peer1",
      "peer-as": 64500,
      "session-state": "ESTABLISHED",
      "established-transitions": "41",
      "last-established": "1776921930399443712",
      messages: {
        received: {
          NOTIFICATION: "39",
          UPDATE: "1471",
          "last-notification-error-code": "openconfig-bgp-types:CEASE",
          "last-notification-error-subcode":
            "openconfig-bgp-types:ADMINISTRATIVE_SHUTDOWN",
          "last-notification-time": "1776921631794543104",
        },
        sent: {
          NOTIFICATION: "1",
          UPDATE: "281",
        },
      },
    },
    "afi-safis": {
      "afi-safi": [
        {
          "afi-safi-name": "openconfig-bgp-types:IPV4_UNICAST",
          state: {
            active: true,
            "afi-safi-name": "openconfig-bgp-types:IPV4_UNICAST",
            enabled: true,
            prefixes: {
              installed: 4,
              received: 4,
              "received-pre-policy": 4,
              sent: 7,
            },
          },
        },
        {
          "afi-safi-name": "openconfig-bgp-types:IPV6_UNICAST",
          state: {
            active: false,
            "afi-safi-name": "openconfig-bgp-types:IPV6_UNICAST",
            prefixes: {
              installed: 0,
              received: 0,
              "received-pre-policy": 0,
              sent: 0,
            },
          },
        },
        {
          "afi-safi-name": "openconfig-bgp-types:L2VPN_EVPN",
          state: {
            active: false,
            "afi-safi-name": "openconfig-bgp-types:L2VPN_EVPN",
            prefixes: {
              installed: 0,
              received: 0,
              "received-pre-policy": 0,
              sent: 0,
            },
          },
        },
      ],
    },
    ...overrides,
  };
}

function wrapInGnmiResponse(neighbors: unknown[]) {
  return {
    result: {
      "network-instances/network-instance/protocols/protocol/bgp/neighbors": {
        "openconfig-network-instance:neighbor": neighbors,
      },
    },
  };
}

// --- formatNsTimestamp ---

describe("formatNsTimestamp", () => {
  it("returns '-' for null", () => {
    expect(formatNsTimestamp(null)).toBe("-");
  });

  it("returns '-' for '0'", () => {
    expect(formatNsTimestamp("0")).toBe("-");
  });

  it("returns '-' for empty string", () => {
    expect(formatNsTimestamp("")).toBe("-");
  });

  it("formats a nanosecond timestamp to ISO-like date string", () => {
    // 1700000000000000000 ns = 1700000000000 ms = 2023-11-14T22:13:20.000Z
    const result = formatNsTimestamp("1700000000000000000");
    expect(result).toMatch(/2023-11-14/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    // Should not contain 'T' (formatISODate replaces it with space)
    expect(result).not.toContain("T");
  });

  it("returns '-' for negative value", () => {
    expect(formatNsTimestamp("-1")).toBe("-");
  });

  it("returns '-' for non-numeric string", () => {
    expect(formatNsTimestamp("abc")).toBe("-");
  });
});

// --- parsePrefixes ---

describe("parsePrefixes", () => {
  it("returns defaults for non-array input", () => {
    const result = parsePrefixes(null as unknown as never[]);
    expect(result.afiSafi).toBe("");
    expect(result.prefixes.active).toBeNull();
    expect(result.prefixes.installed).toBeNull();
  });

  it("returns defaults for empty array", () => {
    const result = parsePrefixes([]);
    expect(result.afiSafi).toBe("");
  });

  it("skips non-unicast AFI-SAFIs", () => {
    const result = parsePrefixes([
      {
        "afi-safi-name": "openconfig-bgp-types:L2VPN_EVPN",
        state: { active: true, prefixes: { installed: 5 } },
      },
    ]);
    expect(result.afiSafi).toBe("");
  });

  it("prefers the active AFI-SAFI over inactive", () => {
    const result = parsePrefixes([
      {
        "afi-safi-name": "openconfig-bgp-types:IPV6_UNICAST",
        state: {
          active: false,
          prefixes: {
            installed: 0,
            received: 0,
            "received-pre-policy": 0,
            sent: 0,
          },
        },
      },
      {
        "afi-safi-name": "openconfig-bgp-types:IPV4_UNICAST",
        state: {
          active: true,
          prefixes: {
            installed: 4,
            received: 4,
            "received-pre-policy": 4,
            sent: 7,
          },
        },
      },
    ]);
    expect(result.afiSafi).toBe("IPv4");
    expect(result.prefixes.active).toBe(true);
    expect(result.prefixes.installed).toBe(4);
    expect(result.prefixes.sent).toBe(7);
  });

  it("falls back to first unicast AFI if none are active", () => {
    const result = parsePrefixes([
      {
        "afi-safi-name": "openconfig-bgp-types:IPV4_UNICAST",
        state: {
          active: false,
          prefixes: {
            installed: 2,
            received: 3,
            "received-pre-policy": 3,
            sent: 1,
          },
        },
      },
      {
        "afi-safi-name": "openconfig-bgp-types:IPV6_UNICAST",
        state: {
          active: false,
          prefixes: {
            installed: 0,
            received: 0,
            "received-pre-policy": 0,
            sent: 0,
          },
        },
      },
    ]);
    expect(result.afiSafi).toBe("IPv4");
    expect(result.prefixes.installed).toBe(2);
  });

  it("returns IPv6 when IPv6 is the active AFI", () => {
    const result = parsePrefixes([
      {
        "afi-safi-name": "openconfig-bgp-types:IPV4_UNICAST",
        state: { active: false, prefixes: { installed: 0 } },
      },
      {
        "afi-safi-name": "openconfig-bgp-types:IPV6_UNICAST",
        state: {
          active: true,
          prefixes: {
            installed: 10,
            received: 12,
            "received-pre-policy": 15,
            sent: 8,
          },
        },
      },
    ]);
    expect(result.afiSafi).toBe("IPv6");
    expect(result.prefixes.installed).toBe(10);
    expect(result.prefixes.received).toBe(12);
    expect(result.prefixes.receivedPrePolicy).toBe(15);
  });

  it("handles active as boolean in prefixes", () => {
    const result = parsePrefixes([
      {
        "afi-safi-name": "openconfig-bgp-types:IPV4_UNICAST",
        state: {
          active: true,
          prefixes: { active: true, installed: 1 },
        },
      },
    ]);
    // prefixes.active from the prefixes object takes priority
    expect(result.prefixes.active).toBe(true);
  });
});

// --- parseGnmiNeighbors ---

describe("parseGnmiNeighbors", () => {
  it("returns empty array for empty response", () => {
    expect(parseGnmiNeighbors({})).toEqual([]);
  });

  it("returns empty array for null response", () => {
    expect(parseGnmiNeighbors(null)).toEqual([]);
  });

  it("parses real Arista gNMI response wrapped in result envelope", () => {
    const response = wrapInGnmiResponse([makeNeighborEntry()]);
    const result = parseGnmiNeighbors(response);

    expect(result).toHaveLength(1);
    expect(result[0].neighborAddress).toBe("10.0.0.1");
    expect(result[0].peerAs).toBe(64500);
    expect(result[0].sessionState).toBe("ESTABLISHED");
    expect(result[0].description).toBe("peer1");
  });

  it("selects active IPv4 AFI over inactive IPv6", () => {
    const response = wrapInGnmiResponse([makeNeighborEntry()]);
    const result = parseGnmiNeighbors(response);

    expect(result[0].afiSafi).toBe("IPv4");
    expect(result[0].prefixes.active).toBe(true);
    expect(result[0].prefixes.installed).toBe(4);
    expect(result[0].prefixes.received).toBe(4);
    expect(result[0].prefixes.receivedPrePolicy).toBe(4);
    expect(result[0].prefixes.sent).toBe(7);
  });

  it("extracts session details including notification info", () => {
    const response = wrapInGnmiResponse([makeNeighborEntry()]);
    const result = parseGnmiNeighbors(response);

    expect(result[0].sessionDetails.lastEstablished).toBe(
      "1776921930399443712",
    );
    expect(result[0].sessionDetails.lastNotificationCode).toBe(
      "openconfig-bgp-types:CEASE",
    );
    expect(result[0].sessionDetails.lastNotificationSubcode).toBe(
      "openconfig-bgp-types:ADMINISTRATIVE_SHUTDOWN",
    );
    expect(result[0].sessionDetails.lastNotificationTime).toBe(
      "1776921631794543104",
    );
  });

  it("parses multiple neighbors", () => {
    const n1 = makeNeighborEntry();
    const n2 = makeNeighborEntry({
      "neighbor-address": "10.0.0.1",
      state: {
        description: "peer2",
        "peer-as": 65000,
        "session-state": "ACTIVE",
      },
      "afi-safis": { "afi-safi": [] },
    });
    const response = wrapInGnmiResponse([n1, n2]);
    const result = parseGnmiNeighbors(response);

    expect(result).toHaveLength(2);
    expect(result[0].neighborAddress).toBe("10.0.0.1");
    expect(result[1].neighborAddress).toBe("10.0.0.1");
    expect(result[1].sessionState).toBe("ACTIVE");
    expect(result[1].peerAs).toBe(65000);
  });

  it("handles neighbor without afi-safis", () => {
    const n = makeNeighborEntry({
      "afi-safis": undefined,
    });
    const response = wrapInGnmiResponse([n]);
    const result = parseGnmiNeighbors(response);

    expect(result[0].afiSafi).toBe("");
    expect(result[0].prefixes.installed).toBeNull();
  });

  it("handles neighbor without messages in state", () => {
    const n = makeNeighborEntry({
      state: {
        "peer-as": 64500,
        "session-state": "ESTABLISHED",
        description: "test",
      },
    });
    const response = wrapInGnmiResponse([n]);
    const result = parseGnmiNeighbors(response);

    expect(result[0].sessionDetails.lastEstablished).toBeNull();
    expect(result[0].sessionDetails.lastNotificationCode).toBeNull();
  });

  it("falls back to config.neighbor-address if top-level missing", () => {
    const n = makeNeighborEntry({
      "neighbor-address": undefined,
    });
    const response = wrapInGnmiResponse([n]);
    const result = parseGnmiNeighbors(response);

    expect(result[0].neighborAddress).toBe("10.0.0.1");
  });

  it("handles response with openconfig-network-instance:neighbors.neighbor path", () => {
    const response = {
      result: {
        somepath: {
          "openconfig-network-instance:neighbors": {
            neighbor: [makeNeighborEntry()],
          },
        },
      },
    };
    const result = parseGnmiNeighbors(response);
    expect(result).toHaveLength(1);
    expect(result[0].neighborAddress).toBe("10.0.0.1");
  });

  it("handles response with flat neighbor array", () => {
    const response = {
      result: {
        somepath: {
          neighbor: [makeNeighborEntry()],
        },
      },
    };
    const result = parseGnmiNeighbors(response);
    expect(result).toHaveLength(1);
  });

  it("handles response without result envelope", () => {
    const response = {
      "openconfig-network-instance:neighbor": [makeNeighborEntry()],
    };
    const result = parseGnmiNeighbors(response);
    expect(result).toHaveLength(1);
  });

  it("handles response that is a direct array", () => {
    const response = [makeNeighborEntry()];
    const result = parseGnmiNeighbors(response);
    expect(result).toHaveLength(1);
  });

  it("defaults session-state to UNKNOWN when missing", () => {
    const n = makeNeighborEntry({
      state: { "peer-as": 100, description: "" },
    });
    const response = wrapInGnmiResponse([n]);
    const result = parseGnmiNeighbors(response);
    expect(result[0].sessionState).toBe("UNKNOWN");
  });

  it("defaults neighbor-address to 'unknown' when both sources missing", () => {
    const n = makeNeighborEntry({
      "neighbor-address": undefined,
      config: {},
    });
    const response = wrapInGnmiResponse([n]);
    const result = parseGnmiNeighbors(response);
    expect(result[0].neighborAddress).toBe("unknown");
  });
});
