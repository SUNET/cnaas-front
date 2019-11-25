const checkResponseStatus = require("./checkResponseStatus");
const credentials =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";

const getData = url => {
  console.log("you're getting data");
  fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${credentials}`
    }
  })
    .then(response => checkRequestStatus(response))
    .then(response => response.json())
    .then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            commitInfo: data.data
          },
          () => {
            console.log("this is new state", this.state.commitInfo);
          }
        );
      }
    });
};

module.exports = getData;
