import { Permission } from "../types/permission";

/**
 * Shared permissions fixture used by permission-related tests. Covers method/
 * endpoint/page/right combinations plus wildcards and overlapping entries.
 */
export const mockPermissions: Permission[] = [
  {
    methods: ["GET"],
    endpoints: ["/devices", "/device/*", "/repository/**", "/groups"],
    pages: ["Devices", "Dashboard", "Groups"],
    rights: ["read"],
  },
  {
    methods: ["*"],
    endpoints: ["*"],
    pages: ["AsterixPage"],
    rights: ["*"],
  },
  {
    methods: ["*"],
    endpoints: ["*"],
    pages: ["Dashboard", "Groups", "Firmware", "Config change"],
    rights: ["read", "write"],
  },
  {
    pages: ["Overlapping"],
    rights: ["read"],
  },
  {
    pages: ["Overlapping"],
    rights: ["write"],
  },
];
