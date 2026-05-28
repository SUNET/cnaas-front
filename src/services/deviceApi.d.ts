/**
 * Cross-page shared device helpers. Page-specific device fetchers live
 * under src/components/<Page>/api/.
 */
export function fetchDevice(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any>;
