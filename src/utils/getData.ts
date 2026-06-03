const checkResponseStatus = require("./checkResponseStatus");
const checkJsonResponse = require("./checkJsonResponse");

const getData = (url, credentials, signal) => {
  return fetch(url, {
    method: "GET",
    headers: {
      ...(credentials && { Authorization: `Bearer ${credentials}` }),
    },
    ...(signal && { signal }),
  }).then((response) => checkJsonResponse(response));
};

const getDataHeaders = (url, credentials, headers) => {
  return fetch(url, {
    method: "GET",
    headers: {
      ...(credentials && { Authorization: `Bearer ${credentials}` }),
      ...headers,
    },
  }).then((response) => checkJsonResponse(response));
};

const getDataToken = (url, credentials, signal) => {
  return fetch(url, {
    method: "GET",
    headers: {
      ...(credentials && { Authorization: `Token ${credentials}` }),
    },
    ...(signal && { signal }),
  }).then((response) => checkJsonResponse(response));
};

const getResponse = (url, credentials, signal) => {
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

module.exports = { getData, getDataHeaders, getDataToken, getResponse };
