const checkJsonResponse = require("./checkJsonResponse");
const checkResponseStatus = require("./checkResponseStatus");

const putData = (url, credentials, dataToSend) => {
  return fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`
    },
    body: JSON.stringify(dataToSend)
  })
    .then(response => checkJsonResponse(response));
};

const postData = (url, credentials, dataToSend) => {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`
    },
    body: JSON.stringify(dataToSend)
  })
    .then(response => checkResponseStatus(response))
    .then(response => response.json());
};

const deleteData = (url, credentials, dataToSend) => {
  return fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`
    },
    body: JSON.stringify(dataToSend)
  })
    .then(response => checkResponseStatus(response))
    .then(response => response.json());
};

module.exports = { putData, postData, deleteData };
