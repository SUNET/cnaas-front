const checkRequestStatus = require("./checkResponseStatus");

const getData = (url, credentials) => {
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${credentials}`
    }
  })
    .then(response => checkRequestStatus(response))
    .then(response => response.json());
};

module.exports = getData;
