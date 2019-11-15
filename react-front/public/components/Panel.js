import React from "react";

class Panel extends React.Component {
  render() {
    console.log("this is device data (in panel)", this.props.responseData);
    let deviceInfo = "";
    const responseData = this.props.responseData;
    deviceInfo = responseData.map((items, index) => {
      return (
        <ul key={index}>
          <li key="0">{items.id}</li>
          <li key="1"> {items.hostname}</li>
          <li key="2">{items.description}</li>
          <li key="3">{items.device_type}</li>
          <li key="4">{items.last_seen}</li>
          <li key="5">{items.management_ip}</li>
        </ul>
      );
    });

    return (
      <div id="panel">
        <h1> This is the panel</h1>

        <div id="request">
          {/* <h2> Make a request </h2> */}
          <button onClick={this.props.requestData}> API request </button>
        </div>
        <div id="response">
          <h2> Get the response</h2>
          <div id="data">{deviceInfo}</div>
        </div>
      </div>
    );
  }
}

export default Panel;
