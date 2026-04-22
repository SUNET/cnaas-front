import {
  computeLinknetMismatches,
  type Linknet,
  type LldpNeighbor,
} from "./linknetVerification";
import type { InterfaceItem } from "./interfaceConfigReducer";

// --- Helpers ---

function makeLinknet(overrides: Partial<Linknet> = {}): Linknet {
  return {
    id: 1,
    ipv4_network: "10.0.0.0/31",
    device_a_id: 100,
    device_a_ip: "10.0.0.0",
    device_a_port: "Ethernet49/1",
    device_b_id: 200,
    device_b_ip: "10.0.0.1",
    device_b_port: "Ethernet1/1",
    site_id: null,
    description: null,
    ...overrides,
  };
}

function lldpEntry(
  localPort: string,
  remoteName: string,
  remotePort: string,
): Record<string, LldpNeighbor[]> {
  return {
    [localPort.toLowerCase()]: [
      {
        remote_system_name: remoteName,
        remote_port: remotePort,
      },
    ],
  };
}

const DEVICE_ID = 100;

// --- Tests ---

describe("computeLinknetMismatches", () => {
  // --- Linknet checks ---

  describe("linknet verification", () => {
    test("no mismatch when LLDP matches linknet (device is side A)", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map([[200, "sw2"]]);
      const lldpNeighbors = lldpEntry("Ethernet49/1", "sw2", "Ethernet1/1");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result).toEqual({});
    });

    test("no mismatch when LLDP matches linknet (device is side B)", () => {
      const linknets = [makeLinknet({ device_a_id: 200, device_b_id: 100 })];
      const deviceMap = new Map([[200, "sw2"]]);
      // Device is side B, so local port is device_b_port (Ethernet1/1)
      // and expected remote is device_a (sw2 on Ethernet49/1)
      const lldpNeighbors = lldpEntry("Ethernet1/1", "sw2", "Ethernet49/1");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result).toEqual({});
    });

    test("mismatch when LLDP hostname differs", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map([[200, "sw2"]]);
      const lldpNeighbors = lldpEntry(
        "Ethernet49/1",
        "wrong-host",
        "Ethernet1/1",
      );

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"]).toBeDefined();
      expect(result["Ethernet49/1"].expectedHostname).toBe("sw2");
      expect(result["Ethernet49/1"].actualHostname).toBe("wrong-host");
      expect(result["Ethernet49/1"].linknetId).toBe(1);
    });

    test("mismatch when LLDP port differs", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map([[200, "sw2"]]);
      const lldpNeighbors = lldpEntry("Ethernet49/1", "sw2", "Ethernet99/1");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"]).toBeDefined();
      expect(result["Ethernet49/1"].expectedPort).toBe("Ethernet1/1");
      expect(result["Ethernet49/1"].actualPort).toBe("Ethernet99/1");
    });

    test("mismatch when no LLDP data for linknet port", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map([[200, "sw2"]]);

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        {},
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"]).toBeDefined();
      expect(result["Ethernet49/1"].actualHostname).toBeNull();
      expect(result["Ethernet49/1"].actualPort).toBeNull();
    });

    test("mismatch when LLDP data is empty array", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map([[200, "sw2"]]);
      const lldpNeighbors = { "ethernet49/1": [] };

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"]).toBeDefined();
    });

    test("uses ID fallback when device not in deviceMap", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map<number, string>(); // empty — 404 case

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        {},
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"].expectedHostname).toBe("ID:200");
    });

    test("uses remote_chassis_id when remote_system_name is empty", () => {
      const linknets = [makeLinknet()];
      const deviceMap = new Map([[200, "sw2"]]);
      const lldpNeighbors: Record<string, LldpNeighbor[]> = {
        "ethernet49/1": [
          {
            remote_system_name: "",
            remote_chassis_id: "aa:bb:cc:dd:ee:ff",
            remote_port: "Ethernet1/1",
          },
        ],
      };

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"]).toBeDefined();
      expect(result["Ethernet49/1"].actualHostname).toBe("aa:bb:cc:dd:ee:ff");
    });

    test("LLDP port lookup is case-insensitive", () => {
      const linknets = [makeLinknet({ device_a_port: "Ethernet49/1" })];
      const deviceMap = new Map([[200, "sw2"]]);
      // LLDP key is lowercase
      const lldpNeighbors = lldpEntry("Ethernet49/1", "sw2", "Ethernet1/1");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result).toEqual({});
    });
  });

  // --- neighbor_id checks ---

  describe("neighbor_id verification", () => {
    test("no mismatch when LLDP hostname matches neighbor_id device", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet50/1", data: { neighbor_id: 300 } },
      ];
      const deviceMap = new Map([[300, "mlag-peer"]]);
      const lldpNeighbors = lldpEntry(
        "Ethernet50/1",
        "mlag-peer",
        "Ethernet50/1",
      );

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        [],
        deviceMap,
      );

      expect(result).toEqual({});
    });

    test("mismatch when LLDP hostname differs from neighbor_id device", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet50/1", data: { neighbor_id: 300 } },
      ];
      const deviceMap = new Map([[300, "mlag-peer"]]);
      const lldpNeighbors = lldpEntry(
        "Ethernet50/1",
        "wrong-peer",
        "Ethernet50/1",
      );

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        [],
        deviceMap,
      );

      expect(result["Ethernet50/1"]).toBeDefined();
      expect(result["Ethernet50/1"].expectedHostname).toBe("mlag-peer");
      expect(result["Ethernet50/1"].actualHostname).toBe("wrong-peer");
      expect(result["Ethernet50/1"].expectedPort).toBe("(neighbor_id)");
      expect(result["Ethernet50/1"].linknetId).toBe(0);
    });

    test("mismatch when no LLDP data for neighbor_id interface", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet50/1", data: { neighbor_id: 300 } },
      ];
      const deviceMap = new Map([[300, "mlag-peer"]]);

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        {},
        [],
        deviceMap,
      );

      expect(result["Ethernet50/1"]).toBeDefined();
      expect(result["Ethernet50/1"].actualHostname).toBeNull();
    });

    test("uses ID fallback when neighbor_id device not in deviceMap", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet50/1", data: { neighbor_id: 999 } },
      ];
      const deviceMap = new Map<number, string>();

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        {},
        [],
        deviceMap,
      );

      expect(result["Ethernet50/1"].expectedHostname).toBe("ID:999");
    });

    test("skipped when interface already flagged by linknet check", () => {
      const linknets = [
        makeLinknet({ device_a_port: "Ethernet50/1", device_b_id: 200 }),
      ];
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet50/1", data: { neighbor_id: 300 } },
      ];
      const deviceMap = new Map([
        [200, "sw2"],
        [300, "mlag-peer"],
      ]);
      // LLDP doesn't match linknet → linknet mismatch takes precedence
      const lldpNeighbors = lldpEntry("Ethernet50/1", "wrong", "wrong");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      // Should be the linknet mismatch, not the neighbor_id one
      expect(result["Ethernet50/1"].linknetId).toBe(1);
      expect(result["Ethernet50/1"].expectedHostname).toBe("sw2");
    });
  });

  // --- neighbor (hostname) checks ---

  describe("neighbor (hostname) verification", () => {
    test("no mismatch when LLDP hostname matches ifData.neighbor", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet1", data: { neighbor: "upstream-sw" } },
      ];
      const lldpNeighbors = lldpEntry("Ethernet1", "upstream-sw", "Ethernet2");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        [],
        new Map(),
      );

      expect(result).toEqual({});
    });

    test("mismatch when LLDP hostname differs from ifData.neighbor", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet1", data: { neighbor: "upstream-sw" } },
      ];
      const lldpNeighbors = lldpEntry("Ethernet1", "other-sw", "Ethernet2");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        [],
        new Map(),
      );

      expect(result["Ethernet1"]).toBeDefined();
      expect(result["Ethernet1"].expectedHostname).toBe("upstream-sw");
      expect(result["Ethernet1"].actualHostname).toBe("other-sw");
      expect(result["Ethernet1"].expectedPort).toBe("(neighbor)");
      expect(result["Ethernet1"].linknetId).toBe(0);
    });

    test("mismatch when no LLDP data for neighbor interface", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet1", data: { neighbor: "upstream-sw" } },
      ];

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        {},
        [],
        new Map(),
      );

      expect(result["Ethernet1"]).toBeDefined();
      expect(result["Ethernet1"].actualHostname).toBeNull();
    });

    test("skipped when interface has neighbor_id (neighbor_id takes priority)", () => {
      const interfaces: InterfaceItem[] = [
        {
          name: "Ethernet1",
          data: { neighbor_id: 300, neighbor: "upstream-sw" },
        },
      ];
      const deviceMap = new Map([[300, "mlag-peer"]]);
      const lldpNeighbors = lldpEntry("Ethernet1", "mlag-peer", "Ethernet1");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        [],
        deviceMap,
      );

      // neighbor_id matches, so no mismatch at all
      expect(result).toEqual({});
    });

    test("skipped when interface already flagged by linknet check", () => {
      const linknets = [
        makeLinknet({ device_a_port: "Ethernet1", device_b_id: 200 }),
      ];
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet1", data: { neighbor: "upstream-sw" } },
      ];
      const deviceMap = new Map([[200, "sw2"]]);
      const lldpNeighbors = lldpEntry("Ethernet1", "wrong", "wrong");

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result["Ethernet1"].linknetId).toBe(1);
    });
  });

  // --- Edge cases ---

  describe("edge cases", () => {
    test("returns empty when no linknets and no neighbor data", () => {
      const result = computeLinknetMismatches(
        DEVICE_ID,
        [{ name: "Ethernet1" }],
        {},
        [],
        new Map(),
      );

      expect(result).toEqual({});
    });

    test("skips interfaces without data", () => {
      const interfaces: InterfaceItem[] = [
        { name: "Ethernet1" },
        { name: "Ethernet2", data: undefined },
      ];

      const result = computeLinknetMismatches(
        DEVICE_ID,
        interfaces,
        {},
        [],
        new Map(),
      );

      expect(result).toEqual({});
    });

    test("handles multiple linknets independently", () => {
      const linknets = [
        makeLinknet({
          id: 1,
          device_a_port: "Ethernet49/1",
          device_b_id: 200,
          device_b_port: "Ethernet1/1",
        }),
        makeLinknet({
          id: 2,
          device_a_port: "Ethernet50/1",
          device_b_id: 201,
          device_b_port: "Ethernet2/1",
        }),
      ];
      const deviceMap = new Map([
        [200, "sw2"],
        [201, "sw3"],
      ]);
      // First linknet matches, second doesn't
      const lldpNeighbors = {
        ...lldpEntry("Ethernet49/1", "sw2", "Ethernet1/1"),
        ...lldpEntry("Ethernet50/1", "sw3", "wrong-port"),
      };

      const result = computeLinknetMismatches(
        DEVICE_ID,
        [],
        lldpNeighbors,
        linknets,
        deviceMap,
      );

      expect(result["Ethernet49/1"]).toBeUndefined();
      expect(result["Ethernet50/1"]).toBeDefined();
      expect(result["Ethernet50/1"].linknetId).toBe(2);
    });
  });
});
