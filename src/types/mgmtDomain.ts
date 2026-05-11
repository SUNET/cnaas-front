/**
 * MgmtDomain — Management domain entity.
 *
 * Backend source: cnaas_nms.db.mgmtdomain.Mgmtdomain.as_dict()
 *
 * `device_a` / `device_b` are hostname strings augmented onto the response by
 * the API layer (resolved from `device_a_id` / `device_b_id`); they are not
 * columns on the underlying ORM model.
 *
 * Nullable DB columns are returned as explicit `null`, never omitted.
 * Verified against `GET /api/v1.0/mgmtdomains` sample response.
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
