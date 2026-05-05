/**
 * Discriminating values for `Device.device_type`.
 *
 * Note: ACCESSMLAG is a UI-only selection in the init form (it submits as
 * ACCESS plus an MLAG peer reference) and is therefore not part of this
 * runtime union.
 */
export type DeviceType = "UNKNOWN" | "ACCESS" | "DIST" | "CORE" | "FIREWALL";

/**
 * Discriminating values for `Device.state`.
 *
 * `UNMANAGED (Replacing)` is a transient client-only marker pushed via
 * `changeStateLocally` while a replace flow is in progress; the backend
 * still reports the device as `UNMANAGED`.
 */
export type DeviceState =
  | "MANAGED"
  | "UNMANAGED"
  | "UNMANAGED (Replacing)"
  | "DHCP_BOOT"
  | "DISCOVERED"
  | "INIT"
  | "UNKNOWN"
  | "PRE_CONFIGURED";

export interface Device {
  readonly id: number;
  readonly hostname: string;
  readonly device_type: DeviceType;
  readonly state: DeviceState;
  readonly synchronized: boolean;
  readonly model?: string;
  readonly os_version?: string;
  readonly management_ip?: string;
  readonly dhcp_ip?: string;
  readonly serial?: string;
  readonly vendor?: string;
  readonly platform?: string;
  readonly ztp_mac?: string;
  readonly deleted?: boolean;
}

/**
 * Runtime arrays for the literal unions above. `as const satisfies …` keeps
 * them in sync with the type at compile time: removing a literal from the
 * union without updating the array is a type error, and vice versa.
 *
 * `UNMANAGED (Replacing)` is intentionally excluded from `DEVICE_STATES` —
 * it is a UI-only marker and is not a valid filterable backend state.
 */
export const DEVICE_TYPES = [
  "UNKNOWN",
  "ACCESS",
  "DIST",
  "CORE",
  "FIREWALL",
] as const satisfies readonly DeviceType[];

export const DEVICE_STATES = [
  "UNKNOWN",
  "PRE_CONFIGURED",
  "DHCP_BOOT",
  "DISCOVERED",
  "INIT",
  "MANAGED",
  "UNMANAGED",
] as const satisfies readonly DeviceState[];

// ----- Predicate helpers (type guards) ------------------------------------
// Encode the DeviceList feature's recurring "ubiquitous language" so call
// sites read as domain language rather than raw conjunctions.
//
// ACCESS / DIST / CORE / FIREWALL are genuine network roles, not arbitrary
// tags — predicates that match a role earn their keep. Compose them with
// lifecycle predicates (isManaged) at the call site rather than introducing
// fused names like `isManagedAccess` that bundle two orthogonal concerns.

export function isAccessDevice(
  device: Device,
): device is Device & { device_type: "ACCESS" } {
  return device.device_type === "ACCESS";
}

export function isDistDevice(
  device: Device,
): device is Device & { device_type: "DIST" } {
  return device.device_type === "DIST";
}

export function isCoreDevice(
  device: Device,
): device is Device & { device_type: "CORE" } {
  return device.device_type === "CORE";
}

export function isFirewallDevice(
  device: Device,
): device is Device & { device_type: "FIREWALL" } {
  return device.device_type === "FIREWALL";
}

export function isManaged(
  device: Device,
): device is Device & { state: "MANAGED" } {
  return device.state === "MANAGED";
}
