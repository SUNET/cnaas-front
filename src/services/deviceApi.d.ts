export function fetchDevice(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;

export function fetchDeviceSettings(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;

export function fetchInterfaceStatus(
  hostname: string,
  token: string | null,
): Promise<Record<string, Record<string, unknown>>>;

export function fetchLldpNeighbors(
  hostname: string,
  token: string | null,
): Promise<Record<string, unknown>>;

export function fetchAccessInterfaces(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;

export function fetchDistInterfaces(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;
