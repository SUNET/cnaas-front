const checkRequestStatus = require("./checkResponseStatus");

const putData = (url, credentials, dataToSend) => {
  return fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`
    },
    body: JSON.stringify(dataToSend)
  })
    .then(response => checkRequestStatus(response))
    .then(response => response.json());
};

const postData = (url, credentials, data) => {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials}`
    },
    body: JSON.stringify(data)
  })
    .then(response => checkRequestStatus(response))
    .then(response => response.json());
};

module.exports = { putData, postData };
