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

const getResponse = (url, credentials) => {
  if (credentials !== undefined) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`,
      },
    }).then((response) => checkResponseStatus(response));
  }

  return fetch(url, {
    method: "GET",
  }).then((response) => checkResponseStatus(response));
};

module.exports = { getData, getResponse };
