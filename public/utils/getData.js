const checkResponseStatus = require("./checkResponseStatus");
const checkJsonResponse = require("./checkJsonResponse");

const getData = (url, credentials) => {
  if (credentials !== undefined ) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`
      }
    })
      .then(response => checkJsonResponse(response))
  }
  else {
    return fetch(url, {
      method: "GET",
    })
      .then(response => checkJsonResponse(response))
  };
}

const getResponse = (url, credentials) => {
  if (credentials !== undefined ) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`
      }
    })
      .then(response => checkResponseStatus(response))
  }
  else {
    return fetch(url, {
      method: "GET",
    })
      .then(response => checkResponseStatus(response))
  };
}
module.exports = { getData, getResponse };
