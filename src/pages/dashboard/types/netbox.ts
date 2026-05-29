/**
 * Feature-local view types for the NetBox data the Dashboard renders.
 *
 * The shared NetBox API (`src/api/netboxApi`) returns loosely-typed
 * `Record<string, unknown>` shapes. These guards narrow the subset of
 * fields the Dashboard reads, so components access typed fields without
 * `as` casts. The unknown -> typed boundary is validated here.
 */

export type NetboxDashboardInterface = {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly speed: number | null;
  readonly device: { readonly id: number; readonly name: string };
  readonly tags: readonly { readonly name: string }[];
};

export type NetboxTenantGroup = {
  readonly name: string;
  readonly description: string | null;
};

export type NetboxTenant = {
  readonly name: string;
  readonly description: string | null;
  readonly group: NetboxTenantGroup | null;
  readonly site_count: number;
  readonly device_count: number;
  readonly vrf_count: number;
  readonly prefix_count: number;
  readonly vlan_count: number;
};

export type NetboxContact = {
  readonly role: { readonly name: string };
  readonly contact: {
    readonly name: string;
    readonly email: string | null;
    readonly phone: string | null;
  };
  readonly priority: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function toNetboxDashboardInterface(
  value: unknown,
): NetboxDashboardInterface | null {
  if (!isObject(value)) return null;
  const { id, name, device, tags } = value;
  if (typeof id !== "number" || typeof name !== "string") return null;
  if (!isObject(device)) return null;
  if (typeof device.id !== "number" || typeof device.name !== "string") {
    return null;
  }
  const tagList = Array.isArray(tags)
    ? tags.flatMap((tag) =>
        isObject(tag) && typeof tag.name === "string"
          ? [{ name: tag.name }]
          : [],
      )
    : [];
  return {
    id,
    name,
    description:
      typeof value.description === "string" ? value.description : null,
    speed: typeof value.speed === "number" ? value.speed : null,
    device: { id: device.id, name: device.name },
    tags: tagList,
  };
}

export function toNetboxTenant(value: unknown): NetboxTenant | null {
  if (!isObject(value)) return null;
  if (typeof value.name !== "string") return null;
  const group =
    isObject(value.group) && typeof value.group.name === "string"
      ? {
          name: value.group.name,
          description:
            typeof value.group.description === "string"
              ? value.group.description
              : null,
        }
      : null;
  const count = (key: string): number => {
    const raw = value[key];
    return typeof raw === "number" ? raw : 0;
  };
  return {
    name: value.name,
    description:
      typeof value.description === "string" ? value.description : null,
    group,
    site_count: count("site_count"),
    device_count: count("device_count"),
    vrf_count: count("vrf_count"),
    prefix_count: count("prefix_count"),
    vlan_count: count("vlan_count"),
  };
}

export function toNetboxContact(value: unknown): NetboxContact | null {
  if (!isObject(value)) return null;
  if (!isObject(value.role) || typeof value.role.name !== "string") return null;
  if (!isObject(value.contact) || typeof value.contact.name !== "string") {
    return null;
  }
  return {
    role: { name: value.role.name },
    contact: {
      name: value.contact.name,
      email:
        typeof value.contact.email === "string" ? value.contact.email : null,
      phone:
        typeof value.contact.phone === "string" ? value.contact.phone : null,
    },
    priority: typeof value.priority === "string" ? value.priority : null,
  };
}
