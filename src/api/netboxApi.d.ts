export function fetchNetboxDevice(
  hostname: string,
  token: string,
): Promise<{ id: number; [key: string]: unknown } | null>;

export function fetchNetboxInterfaces(
  deviceId: number,
  token: string,
): Promise<Array<Record<string, unknown>>>;

export function fetchNetboxModel(
  model: string,
  token: string,
): Promise<Record<string, unknown> | null>;

export function fetchNetboxTenant(
  token: string,
): Promise<Record<string, unknown> | null>;

export function fetchNetboxTenantContacts(
  token: string,
): Promise<Array<Record<string, unknown>>>;

export function fetchNetboxDashboardInterfaces(
  token: string,
): Promise<Array<Record<string, unknown>>>;
