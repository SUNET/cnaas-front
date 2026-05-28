// Subset of the interface payload returned by GET /device/{hostname}/interfaces.
// The backend response is loosely typed; we narrow to the fields the UI reads.
// `data` is nullable — interfaces without LLDP/config data come back as
// { ..., data: null }. `data.neighbor` and `data.neighbor_id` are populated
// from LLDP when a neighbor is present.

export type DeviceInterface = {
  readonly name: string;
  readonly configtype: string;
  readonly data: {
    readonly neighbor?: string;
    readonly neighbor_id?: number;
  } | null;
};
