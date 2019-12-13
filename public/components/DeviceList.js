import React from "react";
import { Button, Select, Input, Icon, Pagination } from "semantic-ui-react";
import DeviceSearchForm from "./DeviceSearchForm";
import checkResponseStatus from "../utils/checkResponseStatus";
import DeviceInitForm from "./DeviceInitForm";

class DeviceList extends React.Component {
  state = {
    sortField: "id",
    filterField: null,
    filterValue: null,
    hostname_sort: "",
    device_type_sort: "",
    synchronized_sort: "",
    devicesData: [],
    activePage: 1,
    totalPages: 1
  };

  getDevicesData = options => {
    if (options === undefined) options = {};
    let newState = this.state;
    if (options.sortField !== undefined) {
      newState["sortField"] = options.sortField;
    }
    if (
      options.filterField !== undefined &&
      options.filterValue !== undefined
    ) {
      newState["filterField"] = options.filterField;
      newState["filterValue"] = options.filterValue;
    }
    if (options.pageNum !== undefined) {
      newState["activePage"] = options.pageNum;
    }
    this.setState(newState);
    return this.getDevicesAPIData(
      newState["sortField"],
      newState["filterField"],
      newState["filterValue"],
      newState["activePage"]
    );
  };

  /**
   * Handle sorting on different columns when clicking the header fields
   */
  sortHeader = header => {
    let newState = this.state;
    let sortField = "id";
    const oldValue = this.state[header + "_sort"];
    newState["hostname_sort"] = "";
    newState["device_type_sort"] = "";
    newState["synchronized_sort"] = "";
    if (oldValue == "" || oldValue == "↑") {
      newState[header + "_sort"] = "↓";
      sortField = header;
    } else if (oldValue == "↓") {
      newState[header + "_sort"] = "↑";
      sortField = "-" + header;
    }
    this.setState(newState);
    this.getDevicesData({ sortField: sortField });
    // Close all expanded table rows when resorting the table
    var deviceDetails = document.getElementsByClassName("device_details_row");
    for (var i = 0; i < deviceDetails.length; i++) {
      deviceDetails[i].hidden = true;
    }
  };

  componentDidMount() {
    this.getDevicesData();
  }

  readHeaders = response => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log("total: " + totalCountHeader);
      const totalPages = Math.ceil(totalCountHeader / 10);
      this.setState({ totalPages: totalPages });
    } else {
      console.log("Could not find X-Total-Count header, only showing one page");
    }
    return response;
  };

  getDevicesAPIData = (sortField = "id", filterField, filterValue, pageNum) => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    // Build filter part of the URL to only return specific devices from the API
    // TODO: filterValue should probably be urlencoded?
    let filterParams = "";
    let filterFieldOperator = "";
    const stringFields = [
      "hostname",
      "management_ip",
      "serial",
      "ztp_mac",
      "platform",
      "vendor",
      "model",
      "os_version"
    ];
    if (filterField != null && filterValue != null) {
      if (stringFields.indexOf(filterField) !== -1) {
        filterFieldOperator = "[contains]";
      }
      filterParams =
        "&filter[" +
        filterField +
        "]" +
        filterFieldOperator +
        "=" +
        filterValue;
    }
    fetch(
      "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/devices?sort=" +
        sortField +
        filterParams +
        "&page=" +
        pageNum +
        "&per_page=10",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials}`
        }
      }
    )
      .then(response => checkResponseStatus(response))
      .then(response => this.readHeaders(response))
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

  /**
   * Handle expand/collapse of device details when clicking a row in the table
   */
  clickRow(e) {
    const curState = e.target.closest("tr").nextElementSibling.hidden;
    if (curState) {
      e.target.closest("tr").nextElementSibling.hidden = false;
    } else {
      e.target.closest("tr").nextElementSibling.hidden = true;
    }
  }

  pageChange(e, data) {
    // Update active page and then reload data
    this.setState({ activePage: data.activePage }, () =>
      this.getDevicesData({ numPage: data.activePage })
    );
  }

  render() {
    let deviceInfo = "";
    const devicesData = this.state.devicesData;
    deviceInfo = devicesData.map((items, index) => {
      let syncStatus = "";
      if (items.synchronized === true) {
        syncStatus = (
          <td key="2">
            <Icon name="check" color="green" />
          </td>
        );
      } else {
        syncStatus = (
          <td key="2">
            <Icon name="delete" color="red" />
          </td>
        );
      }
      let deviceStateExtra = "";
      if (items.state == "DISCOVERED" || items.state == "DHCP_BOOT") {
        deviceStateExtra = <DeviceInitForm deviceId={items.id} />;
      }
      return [
        <tr key={index} onClick={this.clickRow.bind(this)}>
          <td key="0">
            <Icon name="angle down" />
            {items.hostname}
          </td>
          <td key="1">{items.device_type}</td>
          {syncStatus}
          <td key="3">{items.id}</td>
        </tr>,
        <tr
          key={index + "_content"}
          colSpan="4"
          className="device_details_row"
          hidden
        >
          <td>
            <table className="device_details_table">
              <tbody>
                <tr>
                  <td>Description</td>
                  <td>{items.description}</td>
                </tr>
                <tr>
                  <td>Management IP</td>
                  <td>{items.management_ip}</td>
                </tr>
                <tr>
                  <td>Infra IP</td>
                  <td>{items.infra_ip}</td>
                </tr>
                <tr>
                  <td>MAC</td>
                  <td>{items.ztp_mac}</td>
                </tr>
                <tr>
                  <td>Vendor</td>
                  <td>{items.vendor}</td>
                </tr>
                <tr>
                  <td>Model</td>
                  <td>{items.model}</td>
                </tr>
                <tr>
                  <td>OS Version</td>
                  <td>{items.os_version}</td>
                </tr>
                <tr>
                  <td>Serial</td>
                  <td>{items.serial}</td>
                </tr>
                <tr>
                  <td>State</td>
                  <td>{items.state}</td>
                </tr>
              </tbody>
            </table>
            {deviceStateExtra}
          </td>
        </tr>
      ];
    });

    return (
      <section>
        <div id="search">
          <DeviceSearchForm searchAction={this.getDevicesData} />
        </div>
        <div id="device_list">
          <h2>Device list</h2>
          <div id="data">
            <table>
              <thead>
                <tr>
                  <th onClick={() => this.sortHeader("hostname")}>
                    Hostname <Icon name="sort" />{" "}
                    <div className="hostname_sort">
                      {this.state.hostname_sort}
                    </div>
                  </th>
                  <th onClick={() => this.sortHeader("device_type")}>
                    Device type <Icon name="sort" />{" "}
                    <div className="device_type_sort">
                      {this.state.device_type_sort}
                    </div>
                  </th>
                  <th onClick={() => this.sortHeader("synchronized")}>
                    Sync. status <Icon name="sort" />{" "}
                    <div className="sync_status_sort">
                      {this.state.synchronized_sort}
                    </div>
                  </th>
                  <th>id</th>
                </tr>
              </thead>
              <tbody>{deviceInfo}</tbody>
            </table>
          </div>
          <div>
            <Pagination
              defaultActivePage={1}
              totalPages={this.state.totalPages}
              onPageChange={this.pageChange.bind(this)}
            />
          </div>
        </div>
      </section>
    );
  }
}

export default DeviceList;
