/**
 * Linknet mismatch — UI-only record produced by computeLinknetMismatches
 * when the expected neighbor (from linknets/interface data) does not match
 * the observed LLDP neighbor for an interface.
 */

export type LinknetMismatch = {
  expectedHostname: string;
  expectedPort: string;
  actualHostname: string | null;
  actualPort: string | null;
  linknetId: number;
  ipv4Network: string;
};
