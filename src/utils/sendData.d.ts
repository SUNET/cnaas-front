/* eslint-disable @typescript-eslint/no-explicit-any */
export function putData(
  url: string,
  token: string | null,
  data: any,
): Promise<any>;
export function post(
  url: string,
  token: string | null,
  data: any,
): Promise<Response>;
export function postData(
  url: string,
  token: string | null,
  data: any,
): Promise<any>;
