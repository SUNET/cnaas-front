/**
 * Linknet — physical link between two devices.
 *
 * Nullable DB columns are returned as explicit `null`, never omitted.
 */
export type Linknet = {
  readonly id: number;
  readonly ipv4_network: string | null;
  readonly device_a_id: number;
  readonly device_a_hostname: string;
  readonly device_a_ip: string | null;
  readonly device_a_port: string;
  readonly device_b_id: number;
  readonly device_b_hostname: string;
  readonly device_b_ip: string | null;
  readonly device_b_port: string;
  readonly site_id: number | null;
  readonly description: string | null;
};
