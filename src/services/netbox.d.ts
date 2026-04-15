export function fetchNetboxDevice(
  hostname: string,
): Promise<{ id: number; [key: string]: unknown } | null>;

export function fetchNetboxInterfaces(
  deviceId: number,
): Promise<Array<Record<string, unknown>>>;

export function fetchNetboxModel(
  model: string,
): Promise<Record<string, unknown> | null>;
