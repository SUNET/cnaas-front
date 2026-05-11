/**
 * MgmtDomain — Management domain entity.
 *
 * Backend source: cnaas_nms.db.mgmtdomain.Mgmtdomain.as_dict()
 *
 * `device_a` / `device_b` are hostnames added by `as_dict` from the
 * relationship; the `*_id` and `*_ip` fields come straight from the DB
 * columns. Nullable DB columns are returned as explicit `null`, never
 * omitted.
 */
export type MgmtDomain = {
  readonly id: number;
  readonly ipv4_gw: string | null;
  readonly ipv6_gw: string | null;
  readonly device_a_id: number;
  readonly device_a_ip: string | null;
  readonly device_b_id: number;
  readonly device_b_ip: string | null;
  readonly site_id: number | null;
  readonly vlan: number;
  readonly description: string | null;
  readonly esi_mac: string | null;
  readonly device_a: string;
  readonly device_b: string;
};
