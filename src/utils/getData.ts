/* eslint-disable @typescript-eslint/no-explicit-any */
import checkResponseStatus from "./checkResponseStatus";
import checkJsonResponse from "./checkJsonResponse";

export const getData = (
  url: string,
  credentials?: string | null,
  signal?: AbortSignal,
): Promise<any> => {
  return fetch(url, {
    method: "GET",
    headers: {
      ...(credentials && { Authorization: `Bearer ${credentials}` }),
    },
    ...(signal && { signal }),
  }).then((response) => checkJsonResponse(response));
};

export const getDataHeaders = (
  url: string,
  credentials?: string | null,
  headers?: Record<string, string>,
): Promise<any> => {
  return fetch(url, {
    method: "GET",
    headers: {
      ...(credentials && { Authorization: `Bearer ${credentials}` }),
      ...headers,
    },
  }).then((response) => checkJsonResponse(response));
};

export const getDataToken = (
  url: string,
  credentials?: string | null,
  signal?: AbortSignal,
): Promise<any> => {
  return fetch(url, {
    method: "GET",
    headers: {
      ...(credentials && { Authorization: `Token ${credentials}` }),
    },
    ...(signal && { signal }),
  }).then((response) => checkJsonResponse(response));
};

export const getResponse = (
  url: string,
  credentials?: string,
  signal?: AbortSignal,
): Promise<Response> => {
  if (credentials !== undefined) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`,
      },
      ...(signal && { signal }),
    }).then((response) => checkResponseStatus(response));
  }

  return fetch(url, {
    method: "GET",
    ...(signal && { signal }),
  }).then((response) => checkResponseStatus(response));
};
