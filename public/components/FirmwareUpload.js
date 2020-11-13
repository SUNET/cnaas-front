import React from "react";
import formatISODate from "../utils/formatters";
import checkResponseStatus from "../utils/checkResponseStatus";
import { Icon, Button, Popup } from "semantic-ui-react";
import getData from "../utils/getData";

class FirmwareUpload extends React.Component {
  state = {
    firmwareRepoData: [],
    firmwareNmsData: []
  }

  getFirmwareRepoData = () => {
    let url = "https://firmware.cnaas.sunet.se/firmware.json";
    getData(url).then(data => {
      console.log("this should be REPO data", data);
      {
        this.setState(
          {
            firmwareRepoData: data.firmwares
          }
        );
      }
    });
  };

  getFirmwareFiles() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/firmware";
    getData(url, credentials).then(data => {
      console.log("this should be NMS data", data);
      {
        this.setState(
          {
            firmwareNmsData: data.data.files
          }
        );
      }
    });
  }

  componentDidMount() {
    this.getFirmwareRepoData();
    this.getFirmwareFiles();
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
    let firmwareNmsData = this.state.firmwareNmsData;
    let firmwareData = this.state.firmwareRepoData.map((repoFirmware, index) => {
      let newRepoFirmware = repoFirmware;
      newRepoFirmware["present_in_repo"] = true;
      let popIndex = firmwareNmsData.indexOf(repoFirmware.filename);
      if (popIndex > -1) {
        newRepoFirmware["already_uploaded"] = true;
        firmwareNmsData.splice(popIndex, 1);
      } else {
        newRepoFirmware["already_uploaded"] = false;
      }
      return newRepoFirmware;
    });
    console.log("matched firmwares: ", firmwareData);
    firmwareNmsData.map((firmware) => {
      firmwareData.push({
        filename: firmware,
        approved: false,
        present_in_repo: false,
        approved_by: "",
        approved_date: "",
        end_of_life_date: "",
        already_uploaded: true
      });
    })
    console.log("unmatched firmwares: ", firmwareNmsData);

    let firmwareTableBody = firmwareData.map((firmware, index) => {
      let ico = [];
      if (firmware.present_in_repo) {
        ico.push(<Popup
                   content="This firmware is present in the central firmware repository"
                   position="top center"
                   trigger={<Icon name="cloud" />} />);
      }
      if (firmware.already_uploaded) {
        ico.push(<Popup
                   content="This firmware is present on this local NMS instance"
                   position="top center"
                   trigger={<Icon name="disk" />} />);
      }
      if (firmware.approved) {
        ico.push(<Popup
                   content="This firmware is verified/approved"
                   position="top center"
                   trigger={<Icon name="check" color="green" />} />);
      } else {
        ico.push(<Popup
                   content="Warning! This firmware is not verified/approved"
                   position="top center"
                   trigger={<Icon name="delete" color="red" />} />);
      }

      let actions = [];
      if (firmware.already_uploaded) {
        actions.push(
          <form><Button>Remove <Icon name="trash alternate outline" /></Button></form>
        );
      } else {
        actions.push(
          <form><Button>Upload</Button></form>
        );
      }
      return [
        <tr key={index} onClick={this.clickRow.bind(this)}>
          <td key="0">
            <Icon name="angle right" />
            {firmware.filename}
            {ico}
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
                  <td>Approved by</td>
                  <td>{firmware.approved_by}</td>
                </tr>
                <tr>
                  <td>Approved date</td>
                  <td>{firmware.approved_date}</td>
                </tr>
                <tr>
                  <td>End of life date</td>
                  <td>{firmware.end_of_life_date}</td>
                </tr>
              </tbody>
            </table>
            {actions}
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