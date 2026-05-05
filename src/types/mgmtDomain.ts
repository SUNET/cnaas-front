export interface MgmtDomain {
  readonly id: number;
  readonly device_a: string;
  readonly device_b: string;
  readonly ipv4_gw: string;
  readonly ipv6_gw: string;
  readonly vlan: number;
}
