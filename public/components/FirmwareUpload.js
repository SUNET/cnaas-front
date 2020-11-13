import React from "react";
import formatISODate from "../utils/formatters";
import checkResponseStatus from "../utils/checkResponseStatus";
import { Icon } from "semantic-ui-react";

class FirmwareUpload extends React.Component {
  state = {
    firmwareRepoData: []
  }

  getFirmwareRepoData = () => {
    fetch(
      "https://firmware.cnaas.sunet.se/firmware.json",
      {
        method: "GET",
      }
    )
      .then(response => checkResponseStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              firmwareRepoData: data.firmwares
            },
            () => {
              console.log("this is new state", this.state.firmwareRepoData);
            }
          );
        }
      });
  };

  componentDidMount() {
    this.getFirmwareRepoData();
  }

  clickRow(e) {
    const curState = e.target.closest("tr").nextElementSibling.hidden;
    if (curState) {
      e.target.closest("tr").nextElementSibling.hidden = false;
      try {
        e.target.closest("tr").firstElementChild.firstElementChild.className = "angle down icon";
      } catch(error) {
        console.log("Could not change icon for expanded row")
      }
    } else {
      e.target.closest("tr").nextElementSibling.hidden = true;
      try {
        e.target.closest("tr").firstElementChild.firstElementChild.className = "angle right icon";
      } catch(error) {
        console.log("Could not change icon for collapsed row")
      }
    }
  }

  render() {
    let firmwareData = this.state.firmwareRepoData;

    let firmwareTableBody = firmwareData.map((firmware, index) => {
      return [
        <tr key={index} onClick={this.clickRow.bind(this)}>
          <td key="0">
            <Icon name="angle right" />
            {firmware.filename}
          </td>
        </tr>,
        <tr
          key={index + "_content"}
          colSpan="1"
          className="device_details_row"
          hidden
        >
          <td>
            <table className="device_details_table">
              <tbody>
                <tr>
                  <td>Filename</td>
                  <td>{firmware.filename}</td>
                </tr>
                <tr>
                  <td>Finish time</td>
                  <td>{firmware.approved_by}</td>
                </tr>
                <tr>
                  <td>Comment</td>
                  <td>{firmware.approved_date}</td>
                </tr>
                <tr>
                  <td>Ticket reference</td>
                  <td>{firmware.end_of_life_date}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      ];
    });

    return (
      <section>
        <div id="firmware_list">
          <h2>Firmware list</h2>
          <div id="data">
            <table className="firmware_list">
              <thead>
                <tr>
                  <th>
                    Firmwares
                  </th>
                </tr>
              </thead>
              <tbody>{firmwareTableBody}</tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }
}

export default FirmwareUpload;