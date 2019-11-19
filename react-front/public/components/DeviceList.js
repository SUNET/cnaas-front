import React from "react";

class DeviceList extends React.Component {
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

  getDevicesData = () => {
    // check that button click works
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    console.log("you clicked the button");
    fetch("https://tug-lab.cnaas.sunet.se:8443/api/v1.0/devices", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`
      }
    })
      .then(response => this.checkStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              devicesData: data.data.devices
            },
            () => {
              console.log("this is new state", this.state.devicesData);
            }
          );
        }
      });
  };

  render() {
    console.log("these are props (in DeviceList)", this.props);
    let deviceInfo = "";
    // put the response data in a variable
    const devicesData = this.state.devicesData;
    // .map() through the array of response data
    deviceInfo = devicesData.map((items, index) => {
      // deal with renedering domething for the synchronised boolean
      let syncStatus = "";
      if (items.synchronized === true) {
        syncStatus = <td key="2">true</td>;
      } else {
        syncStatus = <td key="2">false</td>;
      }
      // the final component to be rendered from request data
      return (
        <tr key={index}>
          <td key="0"> {items.hostname}</td>
          <td key="1">{items.device_type}</td>
          {syncStatus}
          <td key="3">{items.id}</td>
        </tr>
      );
    });

    return (
      <section>
        <div id="request">
          {/* <h2> Make a request </h2> */}
          <button onClick={this.getDevicesData}> API request </button>
        </div>
        <div id="response">
          <h2> Get the response</h2>
          <div id="data">
            {/* the static part of the table that will hold the response data */}
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Device type</th>
                  <th>Sync. status</th>
                  <th>id</th>
                </tr>
              </thead>
              {/* the dynamic part of the table rendering the response data */}
              <tbody>{deviceInfo}</tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }
}

export default DeviceList;
