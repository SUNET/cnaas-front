const checkRequestStatus = require("./checkResponseStatus");

const getData = (url, credentials) => {
  console.log("you're getting data");
  console.log("url:", url);
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
