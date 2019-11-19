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
    devicesData: []
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
    return this.getDevicesAPIData(
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

  getDevicesAPIData = (sortField = "id", filterField, filterValue) => {
    // check that button click works
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    let filterParams = "";
    console.log("you clicked the button");
    if (filterField != null && filterValue != null) {
      filterParams = "&filter["+filterField+"][contains]="+filterValue;
    }

    fetch("https://tug-lab.cnaas.sunet.se:8443/api/v1.0/devices?sort="+sortField+filterParams, {
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
    const devicesData = this.state.devicesData;
    deviceInfo = devicesData.map((items, index) => {
      let syncStatus = "";
      if (items.synchronized === true) {
        syncStatus = <td key="2">true</td>;
      } else {
        syncStatus = <td key="2">false</td>;
      }
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
        <div id="search">
          {/* <h2> Make a request </h2> */}
          <DeviceSearchForm searchAction={this.getDevicesData} />
        </div>
        <div id="device_list">
          <h2>Device list</h2>
          <div id="data">
            <table>
              <thead>
                <tr>
                  <th onClick={()=>this.sortHeader("hostname")}>Hostname <div className="hostname_sort">{this.state.hostname_sort}</div></th>
                  <th onClick={()=>this.sortHeader("device_type")}>Device type<div className="device_type_sort">{this.state.device_type_sort}</div></th>
                  <th onClick={()=>this.sortHeader("synchronized")}>Sync. status<div className="sync_status_sort">{this.state.synchronized_sort}</div></th>
                  <th>id</th>
                </tr>
              </thead>
              <tbody>{deviceInfo}</tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }
}

DeviceList.propTypes = {
  getDevicesData: PropTypes.func.isRequired,
  devicesData: PropTypes.array.isRequired
}

export default DeviceList;
