/**
 * PortTemplate — a named template for DIST port configuration.
 *
 * Wire shape comes from:
 *   GET /api/v1.0/device/<h>/generate_config
 *     .data.config.available_variables.port_template_options:
 *       Record<string, { description?: string; vlan_config?: unknown }>
 *
 * Additional templates are inferred at fetch time from interfaces whose
 * ifclass starts with "port_template_<name>" (in which case description
 * and vlanConfig are unknown / omitted).
 */
export type PortTemplate = {
  readonly name: string;
  readonly description?: string;
  readonly vlanConfig?: unknown;
};
