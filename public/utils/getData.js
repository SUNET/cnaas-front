const checkResponseStatus = require("./checkResponseStatus");

const getData = (url, credentials) => {
  if (credentials !== undefined ) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`
      }
    })
      .then(response => checkResponseStatus(response))
      .then(response => response.json());
  }
  else {
    return fetch(url, {
      method: "GET",
    })
      .then(response => checkResponseStatus(response))
      .then(response => response.json());
  };
}
module.exports = getData;
