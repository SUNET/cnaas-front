export function fetchNetboxDevice(
  hostname: string,
  token: string | null,
): Promise<{ id: number; [key: string]: unknown } | null>;

export function fetchNetboxInterfaces(
  deviceId: number,
  token: string | null,
): Promise<Array<Record<string, unknown>>>;

export function fetchNetboxModel(
  model: string,
  token: string | null,
): Promise<Record<string, unknown> | null>;

export function fetchNetboxTenant(
  token: string | null,
): Promise<Record<string, unknown> | null>;

export function fetchNetboxTenantContacts(
  token: string | null,
): Promise<Array<Record<string, unknown>>>;

export function fetchNetboxDashboardInterfaces(
  token: string | null,
): Promise<Array<Record<string, unknown>>>;
