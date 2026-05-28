/**
 * Pure comparison logic for linknet and neighbor verification.
 *
 * Given pre-fetched data, computes which interfaces have a mismatch
 * between expected neighbors (from linknets / interface data) and
 * actual LLDP neighbors.
 */

import type {
  AccessInterfaceItem,
  DistInterfaceItem,
} from "../types/interfaces";
import type { LinknetMismatch } from "./interfaceConfigReducer";
import type { LldpNeighbor } from "../types/lldp";

export type Linknet = {
  id: number;
  ipv4_network: string;
  device_a_id: number;
  device_a_ip: string;
  device_a_port: string;
  device_b_id: number;
  device_b_ip: string;
  device_b_port: string;
  site_id: number | null;
  description: string | null;
};

/**
 * Compute linknet and neighbor mismatches for a device.
 *
 * Checks three sources in priority order:
 * 1. Linknets — verifies hostname + port against LLDP
 * 2. ifData.neighbor_id — resolves via deviceMap, verifies hostname against LLDP
 * 3. ifData.neighbor — verifies hostname directly against LLDP
 *
 * An interface already flagged by a higher-priority check is not re-checked.
 */

export type LinknetVerificationResult = {
  mismatches: Record<string, LinknetMismatch>;
  checkedPorts: string[];
};

/**
 * Compute linknet and neighbor mismatches for a device.
 *
 * Checks three sources in priority order:
 * 1. Linknets — verifies hostname + port against LLDP
 * 2. ifData.neighbor_id — resolves via deviceMap, verifies hostname against LLDP
 * 3. ifData.neighbor — verifies hostname directly against LLDP
 *
 * An interface already flagged by a higher-priority check is not re-checked.
 *
 * Returns both the mismatches and the list of all ports that were checked,
 * so callers can distinguish "checked and OK" from "not checked".
 */
export function computeLinknetMismatches(
  deviceId: number,
  interfaces: (AccessInterfaceItem | DistInterfaceItem)[],
  lldpNeighbors: Record<string, LldpNeighbor[]>,
  linknets: Linknet[],
  deviceMap: Map<number, string>,
): LinknetVerificationResult {
  const mismatches: Record<string, LinknetMismatch> = {};
  const checkedPorts: string[] = [];

  // --- 1. Linknet checks (hostname + port) ---

  for (const ln of linknets) {
    const isA = ln.device_a_id === deviceId;
    const localPort = isA ? ln.device_a_port : ln.device_b_port;
    const remoteDeviceId = isA ? ln.device_b_id : ln.device_a_id;
    const remotePort = isA ? ln.device_b_port : ln.device_a_port;

    const expectedHostname =
      deviceMap.get(remoteDeviceId) ?? `ID:${remoteDeviceId}`;
    const expectedPort = remotePort;

    const lldpData = lldpNeighbors[localPort.toLowerCase()];

    let actualHostname: string | null = null;
    let actualPort: string | null = null;
    let mismatch = false;

    if (!lldpData || lldpData.length === 0) {
      mismatch = true;
    } else {
      const neighbor = lldpData[0];
      actualHostname =
        neighbor.remote_system_name || neighbor.remote_chassis_id || null;
      actualPort = neighbor.remote_port || null;

      if (actualHostname !== expectedHostname || actualPort !== expectedPort) {
        mismatch = true;
      }
    }

    checkedPorts.push(localPort);

    if (mismatch) {
      mismatches[localPort] = {
        expectedHostname,
        expectedPort,
        actualHostname,
        actualPort,
        linknetId: ln.id,
        ipv4Network: ln.ipv4_network,
      };
    }
  }

  // --- 2. neighbor_id checks (hostname only) ---

  for (const iface of interfaces) {
    const neighborId = iface.data?.neighbor_id as number | undefined;
    if (neighborId == null) continue;
    if (mismatches[iface.name]) continue;

    checkedPorts.push(iface.name);

    const expectedHostname = deviceMap.get(neighborId) ?? `ID:${neighborId}`;

    const lldpData = lldpNeighbors[iface.name.toLowerCase()];

    let actualHostname: string | null = null;
    let mismatch = false;

    if (!lldpData || lldpData.length === 0) {
      mismatch = true;
    } else {
      const neighbor = lldpData[0];
      actualHostname =
        neighbor.remote_system_name || neighbor.remote_chassis_id || null;

      if (actualHostname !== expectedHostname) {
        mismatch = true;
      }
    }

    if (mismatch) {
      mismatches[iface.name] = {
        expectedHostname,
        expectedPort: "(neighbor_id)",
        actualHostname,
        actualPort: null,
        linknetId: 0,
        ipv4Network: "",
      };
    }
  }

  // --- 3. neighbor (hostname) checks ---

  for (const iface of interfaces) {
    const neighborHostname = iface.data?.neighbor as string | undefined;
    if (!neighborHostname) continue;
    if (iface.data?.neighbor_id != null) continue;
    if (mismatches[iface.name]) continue;

    checkedPorts.push(iface.name);

    const lldpData = lldpNeighbors[iface.name.toLowerCase()];

    let actualHostname: string | null = null;
    let mismatch = false;

    if (!lldpData || lldpData.length === 0) {
      mismatch = true;
    } else {
      const neighbor = lldpData[0];
      actualHostname =
        neighbor.remote_system_name || neighbor.remote_chassis_id || null;

      if (actualHostname !== neighborHostname) {
        mismatch = true;
      }
    }

    if (mismatch) {
      mismatches[iface.name] = {
        expectedHostname: neighborHostname,
        expectedPort: "(neighbor)",
        actualHostname,
        actualPort: null,
        linknetId: 0,
        ipv4Network: "",
      };
    }
  }

  return { mismatches, checkedPorts };
}
