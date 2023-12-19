import React from "react";
import { Icon } from 'semantic-ui-react'
import permissionsCheck from "../utils/permissions/permissionsCheck"
import { getData } from "../utils/getData"

class GroupList extends React.Component {
  state = {
    groupData: {},
    loading: true,
    error: null
  };

  componentWillMount() {
    this.getGroupsData();
  }

  getGroupsData = () => {
    this.setState({loading: true, error: null});
    const credentials = localStorage.getItem("token");
    // Build filter part of the URL to only return specific devices from the API
    // TODO: filterValue should probably be urlencoded?
    getData(process.env.API_URL + "/api/v1.0/groups", credentials)
    .then(data => 
      {
        this.setState(
          {
            groupData: data.data.groups
          },
          () => {
            console.log("this is new state", this.state.devicesData);
          }
        );
        return;
      }
      
    ).catch((error) => {
      this.setState({
        groupData: [],
        loading: false,
        error: error
      })
    });


  };

  render() {
    let groupTable = Object.keys(this.state.groupData).map((key, index) => {
      return [
        <tr key={ key }>
          <td>{ key }</td>
          <td>{ this.state.groupData[key].join(", ") }</td>
          <td hidden= {!permissionsCheck("Groups", "read")}>
            <div>
              <a href={"/config-change?group=" + key } hidden= {!permissionsCheck("Config change", "write")} title="Go to config change/sync to page"><Icon name="sync" />Sync...</a><br />
              <a href={"/firmware-upgrade?group=" + key } hidden= {!permissionsCheck("Firmware", "write")} title="Go to firmware upgrade page"><Icon name="microchip" />Firmware upgrade...</a>
            </div>
          </td> 
        </tr>
      ]
    })
    if (this.state.error) {
      groupTable = [<tr key="error"><td colSpan="5">API error: {this.state.error.message}</td></tr>];
    } else if (!Array.isArray(groupTable) || !groupTable.length) {
      if (this.state.loading) {
        groupTable = [<tr key="Loading"><td colSpan="5"><Icon name="spinner" loading={true} />Loading groups...</td></tr>];
      } else {
        groupTable = [<tr><td colSpan="5">Empty result</td></tr>];
      }
    }

    return (
      <section>
        <div id="group_list">
          <h2>Group list</h2>
          <div id="data">
            <table>
              <thead>
                <tr>
                  <th>
                    Group name
                  </th>
                  <th>
                    Group members
                  </th>
                  <th hidden={!permissionsCheck("Groups", "read")}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>{groupTable}</tbody>
            </table>
          </div>
          <div>
          </div>
        </div>
      </section>
    );
  }
}

export default GroupList;
