/* eslint-disable @typescript-eslint/no-explicit-any */
export function getData(
  url: string,
  credentials?: string | null,
  signal?: AbortSignal,
): Promise<any>;
export function getDataHeaders(
  url: string,
  credentials?: string | null,
  headers?: Record<string, string>,
): Promise<any>;
export function getDataToken(
  url: string,
  credentials?: string | null,
  signal?: AbortSignal,
): Promise<any>;
export function getResponse(
  url: string,
  credentials?: string,
): Promise<Response>;
