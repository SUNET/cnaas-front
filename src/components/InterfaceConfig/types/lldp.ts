/**
 * LLDP neighbor wire shape returned by GET /api/v1.0/device/<hostname>/lldp_neighbors.
 * Keyed by interface name (lowercased): Record<string, LldpNeighbor[]>.
 */
export type LldpNeighbor = {
  readonly remote_system_name?: string;
  readonly remote_chassis_id?: string;
  readonly remote_port?: string;
  readonly remote_port_description?: string;
  readonly remote_system_description?: string;
  readonly remote_system_capab?: string[];
};
