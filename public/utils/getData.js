const checkResponseStatus = require("./checkResponseStatus");

const getData = (url, credentials) => {
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${credentials}`
    }
  })
    .then(response => checkResponseStatus(response))
    .then(response => response.json());
};

module.exports = getData;
