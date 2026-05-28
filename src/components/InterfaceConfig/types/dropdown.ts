/**
 * UI primitive used by Semantic UI dropdowns throughout InterfaceConfig.
 * Shape kept loose to accommodate VLAN, tag, and port-template options.
 */
export type DropdownOption = {
  text: string;
  value: string | number | null;
  description?: number | string;
  vlan_config?: unknown;
  key?: string | number;
};
