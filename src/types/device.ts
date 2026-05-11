/**
 * Discriminating values for `Device.device_type`.
 *
 * Note: ACCESSMLAG is a UI-only selection in the init form (it submits as
 * ACCESS plus an MLAG peer reference) and is therefore not part of this
 * runtime union.
 */
export type DeviceType = "UNKNOWN" | "ACCESS" | "DIST" | "CORE" | "FIREWALL";

/**
 * Runtime arrays for the literal unions above. `as const satisfies …` keeps
 * them in sync with the type at compile time: removing a literal from the
 * union without updating the array is a type error, and vice versa.
 */
export const DEVICE_TYPES = [
  "UNKNOWN",
  "ACCESS",
  "DIST",
  "CORE",
  "FIREWALL",
] as const satisfies readonly DeviceType[];

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

export const DEVICE_STATES = [
  "UNKNOWN",
  "PRE_CONFIGURED",
  "DHCP_BOOT",
  "DISCOVERED",
  "INIT",
  "MANAGED",
  "UNMANAGED",
] as const satisfies readonly DeviceState[];

/**
 * ZTP lifecycle states: a device is in the Zero Touch Provisioning pipeline.
 * Pre-typed and pre-fabric — the goal is to bring devices out of these states
 * and into MANAGED with a concrete device_type.
 *
 * Lifecycle: DHCP_BOOT → DISCOVERED → INIT → MANAGED.
 */
export const ZTP_STATES = [
  "DHCP_BOOT",
  "DISCOVERED",
  "INIT",
] as const satisfies readonly DeviceState[];
export type ZtpState = (typeof ZTP_STATES)[number];

/**
 * Active states: device has completed ZTP and has a concrete device_type.
 * The action menu and expanded panel are dispatched by device_type when
 * a device is in one of these states.
 */
export const ACTIVE_STATES = [
  "MANAGED",
  "UNMANAGED",
  "UNMANAGED (Replacing)",
] as const satisfies readonly DeviceState[];
export type ActiveState = (typeof ACTIVE_STATES)[number];

// Sentinel state/type literals — named because they represent fallback cases
// in the dispatch tree (defensive branches, not first-class domain values).
export const DEVICE_STATE_PRE_CONFIGURED =
  "PRE_CONFIGURED" as const satisfies DeviceState;
export const DEVICE_STATE_UNKNOWN = "UNKNOWN" as const satisfies DeviceState;
export const DEVICE_TYPE_UNKNOWN = "UNKNOWN" as const satisfies DeviceType;

export type Device = {
  readonly id: number;
  readonly hostname: string;
  readonly device_type: DeviceType;
  readonly state: DeviceState;
  readonly site_id: number | null;
  readonly description: string | null;
  readonly management_ip: string | null;
  readonly secondary_management_ip: string | null;
  readonly dhcp_ip: string | null;
  readonly infra_ip: string | null;
  readonly oob_ip: string | null;
  readonly serial: string | null;
  readonly ztp_mac: string | null;
  readonly platform: string | null;
  readonly vendor: string | null;
  readonly model: string | null;
  readonly os_version: string | null;
  readonly synchronized: boolean | null;
  readonly confhash: string | null;
  readonly last_seen: string | null; // "YYYY-MM-DD HH:MM:SS.ffffff", not ISO 8601
  readonly port: number | null;

  // primary_group is added by the backend's device_data_postprocess only when
  // the hostname maps to a group; therefore genuinely optional, not nullable.
  readonly primary_group?: string;

  // Frontend-only soft-delete marker; set in the reducer when a delete socket
  // event arrives. The backend Device.as_dict() never emits this field.
  readonly deleted?: boolean;
};

// ----- Predicate helpers (type guards) ------------------------------------

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

export function isInZtp(
  device: Device,
): device is Device & { state: ZtpState } {
  return ZTP_STATES.some((s) => s === device.state);
}

export function isActive(
  device: Device,
): device is Device & { state: ActiveState } {
  return ACTIVE_STATES.some((s) => s === device.state);
}

export function isDeviceType(value: unknown): value is DeviceType {
  return (
    typeof value === "string" &&
    (DEVICE_TYPES as readonly string[]).includes(value)
  );
}
