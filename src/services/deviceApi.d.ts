export function fetchDevice(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;

export function fetchDeviceSettings(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;

export function fetchInterfaceStatus(
  hostname: string,
  token: string | null,
): Promise<Record<string, Record<string, unknown>>>;

export function fetchLldpNeighbors(
  hostname: string,
  token: string | null,
): Promise<Record<string, unknown>>;

import type {
  AccessInterfaceItem,
  DistInterfaceItem,
  DropdownOption,
} from "../store/interfaceConfig/interfaceConfigReducer";

export interface AccessInterfacesResult {
  interfaces: AccessInterfaceItem[];
  tags: { text: string; value: string }[];
  mlagPeerHostname: string | null;
}

export function fetchAccessInterfaces(
  hostname: string,
  token: string | null,
): Promise<AccessInterfacesResult | null>;

export interface DistInterfacesResult {
  interfaces: DistInterfaceItem[];
  tags: { text: string; value: string }[];
  portTemplates: DropdownOption[];
}

export function fetchDistInterfaces(
  hostname: string,
  token: string | null,
): Promise<DistInterfacesResult | null>;

export function fetchDeviceById(
  deviceId: number,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;

export function fetchLinknets(
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]>;

export function fetchBgpSettings(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]>;

export function fetchBgpNeighbors(
  managementIp: string,
  vrfName: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;
