/**
 * VLAN — a VXLAN entry from device settings.
 *
 * Wire shape comes from GET /api/v1.0/settings?hostname=<h>
 *   data.settings.vxlans: Record<string, { vni, vlan_name, vlan_id }>
 *
 * Mapped to a flat domain entity here. The Record key is just the vxlan
 * name (== vlan_name) and is dropped.
 */
export type Vlan = {
  readonly vni: number;
  readonly name: string;
  readonly id: number;
};
