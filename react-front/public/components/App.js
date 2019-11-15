import React from "react";
import Header from "./Header";
import Panel from "./Panel";
import Footer from "./Footer";

class App extends React.Component {
  // here we set the initial state of the component
  state = {
    // token: "",
    devicesData: []
    // errorMessage: ""
  };

  // here we check the status of the response and only process the result if status is 200
  checkStatus = response => {
    console.log("we have response");
    if (response.status === 200) {
      console.log("response 200");
      return Promise.resolve(response);
    } else if (response.status === 400 || response.status === 401) {
      this.setState({
        errorMessage: "Your details were not recognised. Try again!"
      });
    } else if (response.staus === 500) {
      this.setState({
        errorMessage: "Something went wrong on our end. Try again later."
      });
    }
  };

  getDeviceData = () => {
    // check that button click works
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    console.log("you clicked the button");
    fetch("https://tug-lab.cnaas.sunet.se:8443/api/v1.0/device/9", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`
      }
    })
      .then(response => this.checkStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
      });
  };

  render() {
    return (
      <div className="container">
        <Header />
        <Panel requestData={this.getDeviceData} />
        <Footer />
      </div>
    );
  }
}

export default App;
