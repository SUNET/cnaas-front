import React from "react";
import checkResponseStatus from "../utils/checkResponseStatus";

class GroupList extends React.Component {
  state = {
    groupData: {}
  };

  componentWillMount() {
    this.getGroupsData();
  }

  getGroupsData = () => {
    const credentials = localStorage.getItem("token");
    // Build filter part of the URL to only return specific devices from the API
    // TODO: filterValue should probably be urlencoded?
    fetch(
      process.env.API_URL + "/api/v1.0/groups",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials}`
        }
      }
    )
      .then(response => checkResponseStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              groupData: data.data.groups
            },
            () => {
              console.log("this is new state", this.state.devicesData);
            }
          );
        }
      });
  };

  render() {
    let groupTable = "";
    groupTable = Object.keys(this.state.groupData).map((key, index) => {
      return [
        <tr>
          <td>{ key }</td>
          <td>{ this.state.groupData[key].join(", ") }</td>
          <td><a href={"/config-change?group=" + key }>Sync</a></td>
        </tr>
      ]
    })

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
                  <th>
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
