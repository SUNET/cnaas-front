import React from "react";

class DeviceList extends React.Component {
  state = {
    sortField: "id",
    filterField: null,
    filterValue: null
  };

  getDevicesData = (options) => {
    if (options === undefined) options = {};
    let newState = this.state;
    if (options.sortField !== undefined) {
      newState['sortField'] = options.sortField;
    }
    if (options.filterField !== undefined && options.filterValue !== undefined) {
      newState['filterField'] = options.filterField;
      newState['filterValue'] = options.filterValue;
    }
    this.setState(newState);
    return this.props.getDevicesData(
      newState['sortField'],
      newState['filterField'],
      newState['filterValue']
    );
  };

  render() {
    console.log("these are props (in DeviceList)", this.props);
    console.log("this is device data (in DeviceList)", this.props.devicesData);
    let deviceInfo = "";
    // put the response data in a variable
    const devicesData = this.props.devicesData;
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
      <div id="component">
        <div id="request">
          {/* <h2> Make a request </h2> */}
          <button onClick={()=>this.getDevicesData()}> API request </button>
          <button onClick={()=>this.getDevicesData({ filterField: "hostname", filterValue: "arista" })}> Filter </button>
          <button onClick={()=>this.getDevicesData({ filterField: null, filterValue: null })}> Clear filter </button>
        </div>
        <div id="response">
          <h2> Get the response</h2>
          <div id="data">
            {/* the static part of the table that will hold the response data */}
            <table>
              <thead>
                <tr>
                  <th onClick={()=>this.getDevicesData({ sortField: "hostname" })}>Hostname</th>
                  <th onClick={()=>this.getDevicesData({ sortField: "device_type" })}>Device type</th>
                  <th onClick={()=>this.getDevicesData({ sortField: "synchronized" })}>Sync. status</th>
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

export default DeviceList;
