import React from "react";
import PropTypes from 'prop-types'
import DeviceSearchForm from "./DeviceSearchForm";

class DeviceList extends React.Component {
  state = {
    sortField: "id",
    filterField: null,
    filterValue: null,
    hostname_sort: "",
    device_type_sort: "",
    synchronized_sort: "",
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

  sortHeader = (header) => {
    let newState = this.state;
    let sortField = "id";
    const oldValue = this.state[header+'_sort'];
    newState['hostname_sort'] = '';
    newState['device_type_sort'] = '';
    newState['synchronized_sort'] = '';
    if (oldValue == '' || oldValue == '↑') {
      newState[header+'_sort'] = "↓";
      sortField = header;
    } else if (oldValue == '↓') {
      newState[header+'_sort'] = "↑";
      sortField = "-"+header;
    }
    this.setState(newState);
    this.getDevicesData({ sortField: sortField });
  };

  componentDidMount() {
    this.getDevicesData();
  }

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
        <div id="search">
          {/* <h2> Make a request </h2> */}
          <DeviceSearchForm searchAction={this.getDevicesData} />
        </div>
        <div id="device_list">
          <h2>Device list</h2>
          <div id="data">
            {/* the static part of the table that will hold the response data */}
            <table>
              <thead>
                <tr>
                  <th onClick={()=>this.sortHeader("hostname")}>Hostname <div className="hostname_sort">{this.state.hostname_sort}</div></th>
                  <th onClick={()=>this.sortHeader("device_type")}>Device type<div className="device_type_sort">{this.state.device_type_sort}</div></th>
                  <th onClick={()=>this.sortHeader("synchronized")}>Sync. status<div className="sync_status_sort">{this.state.synchronized_sort}</div></th>
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

DeviceList.propTypes = {
  getDevicesData: PropTypes.func.isRequired,
  devicesData: PropTypes.array.isRequired
}

export default DeviceList;
