/**
 * Interface item wire shapes returned by the backend.
 *
 *   AccessInterfaceItem  -> GET /api/v1.0/device/<hostname>/interfaces
 *   DistInterfaceItem    -> GET /api/v1.0/device/<hostname>/generate_config
 *                           (.data.config.available_variables.interfaces[])
 *
 * ACCESS `data` has a closed shape validated by the backend
 * (cnaas-nms/src/cnaas_nms/api/interface.py PUT handler).
 * DIST `data` is kept opaque (only emitted for ifclass="downlink",
 * currently only carries `description`).
 */

export type AccessInterfaceData = {
  vxlan?: string;
  untagged_vlan?: number | string;
  tagged_vlan_list?: (number | string)[];
  neighbor?: string;
  neighbor_id?: number;
  description?: string;
  enabled?: boolean;
  aggregate_id?: number;
  bpdu_filter?: boolean;
  redundant_link?: boolean;
  tags?: string[];
  cli_append_str?: string;
};

export type AccessInterfaceItem = {
  name: string;
  indexnum: number;
  configtype: string;
  config?: string | null;
  data: AccessInterfaceData | null;
};

export type DistInterfaceItem = {
  name: string;
  indexnum: number;
  ifclass: string;
  config?: string | null;
  tags?: string[] | null;
  tagged_vlan_list?: (number | string)[] | null;
  redundant_link?: boolean; // only on ifclass === "downlink"
  peer_hostname?: string; // only on ifclass === "fabric"
  data?: Record<string, unknown>; // only on ifclass === "downlink"
};
