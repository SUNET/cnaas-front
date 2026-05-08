// Subset of the interface payload returned by GET /device/{hostname}/interfaces.
// The backend response is loosely typed; we narrow to the fields the UI reads.
// `data.neighbor` and `data.neighbor_id` are populated from LLDP when a
// neighbor is present.

export interface DeviceInterface {
  readonly name: string;
  readonly configtype: string;
  readonly data: {
    readonly neighbor?: string;
    readonly neighbor_id?: number;
  };
}
