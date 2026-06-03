/* eslint-disable @typescript-eslint/no-explicit-any */
import checkJsonResponse from "./checkJsonResponse";
import checkResponseStatus from "./checkResponseStatus";

export const putData = (
  url: string,
  credentials: string | null,
  dataToSend: any,
): Promise<any> => {
  return fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`,
    },
    body: JSON.stringify(dataToSend),
  }).then((response) => checkJsonResponse(response));
};

export const post = async (
  url: string,
  token: string | null,
  dataToSend: any,
): Promise<Response> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dataToSend),
    credentials: "include",
  });
  if (!response.ok) {
    throw response;
  }
  return response;
};

export const postData = (
  url: string,
  credentials: string | null,
  dataToSend: any,
): Promise<any> => {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`,
    },
    body: JSON.stringify(dataToSend),
    credentials: "include",
  })
    .then((response) => checkResponseStatus(response))
    .then((response) => response.json());
};

export const deleteData = (
  url: string,
  credentials: string | null,
  dataToSend?: any,
): Promise<any> => {
  return fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`,
    },
    body: JSON.stringify(dataToSend),
  })
    .then((response) => checkResponseStatus(response))
    .then((response) => response.json());
};
