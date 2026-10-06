/**
 * Pure VLAN id <-> name mapping helpers.
 *
 * The backend always stores/returns VLAN ids. The UI works with VLAN names
 * (for display, and for matching Autocomplete option values), so these
 * helpers translate at the edges: id -> name for rendering, name -> id
 * before an edit is stored/dispatched.
 *
 * Both are idempotent passthroughs for anything already in the target
 * shape, or that isn't a VLAN at all (freeform VLAN ranges like "100-200",
 * or null/undefined meaning "no VLAN selected") — there's nothing to map
 * in those cases, so the value is returned unchanged.
 */

import type { Vlan } from "../types/vlan";

export function mapVlanIdToName(vlan: unknown, vlans: Vlan[]): unknown {
  if (typeof vlan !== "number") return vlan;
  const match = vlans.find((v) => v.id === vlan);
  return match ? match.name : vlan;
}

export function mapVlanNameToId(name: unknown, vlans: Vlan[]): unknown {
  if (typeof name !== "string") return name;
  const match = vlans.find((v) => v.name === name);
  return match ? match.id : name;
}
