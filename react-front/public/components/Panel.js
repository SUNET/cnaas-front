import React from "react";

class Panel extends React.Component {
  render() {
    console.log("this is device data (in panel)", this.props.responseData);
    let deviceInfo = "";
    // put the response data in a variable
    const responseData = this.props.responseData;
    // .map() through the array of response data
    deviceInfo = responseData.map((items, index) => {
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
      <div id="panel">
        <h1> This is the panel</h1>

        <div id="request">
          {/* <h2> Make a request </h2> */}
          <button onClick={this.props.requestData}> API request </button>
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
      </div>
    );
  }
}

export default Panel;
