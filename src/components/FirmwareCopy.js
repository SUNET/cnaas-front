import React from "react";
import { Icon, Popup } from "semantic-ui-react";
import { getData } from "../utils/getData";
import FirmwareCopyForm from "./FirmwareCopyForm";
import permissionsCheck from "../utils/permissions/permissionsCheck";

class FirmwareCopy extends React.Component {
  state = {
    firmwareRepoData: [],
    firmwareNmsFiles: [],
    firmwareNmsDefaults: [],
    firmwareCopyJobIds: {},
  };

  getFirmwareRepoData = () => {
    const url = process.env.FIRMWARE_REPO_METADATA_URL;
    getData(url).then((data) => {
      console.log("this should be REPO data", data);
      {
        this.setState({
          firmwareRepoData: data.firmwares,
        });
      }
    });
  };

  getFirmwareFiles() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware`;
    getData(url, credentials).then((data) => {
      console.log("this should be NMS data", data);
      {
        this.setState({
          firmwareNmsFiles: data.data.files,
          firmwareNmsDefaults: data.data.defaults,
        });
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
        e.target.closest("tr").firstElementChild.firstElementChild.className =
          "angle down icon";
      } catch {
        console.log("Could not change icon for expanded row");
      }
    } else {
      e.target.closest("tr").nextElementSibling.hidden = true;
      try {
        e.target.closest("tr").firstElementChild.firstElementChild.className =
          "angle right icon";
      } catch {
        console.log("Could not change icon for collapsed row");
      }
    }
  }

  isDefaultFirmware(filename) {
    if (!Array.isArray(this.state.firmwareNmsDefaults)) {
      return false;
    }
    return this.state.firmwareNmsDefaults.some((obj) => obj.file === filename);
  }

  render() {
    const { firmwareNmsFiles } = this.state;
    const firmwareData = this.state.firmwareRepoData.map((repoFirmware) => {
      const newRepoFirmware = repoFirmware;
      newRepoFirmware.present_in_repo = true;
      const popIndex = firmwareNmsFiles.indexOf(repoFirmware.filename);
      if (popIndex > -1) {
        newRepoFirmware.already_downloaded = true;
        firmwareNmsFiles.splice(popIndex, 1);
      } else {
        newRepoFirmware.already_downloaded = false;
      }
      return newRepoFirmware;
    });
    console.log("matched firmwares: ", firmwareData);
    firmwareNmsFiles.forEach((firmware) => {
      firmwareData.push({
        filename: firmware,
        approved: false,
        present_in_repo: false,
        approved_by: "",
        approved_date: "",
        end_of_life_date: "",
        os_version: "",
        already_downloaded: true,
      });
    });
    console.log("unmatched firmwares: ", firmwareNmsFiles);

    const firmwareTableBody = firmwareData.map((firmware, index) => {
      const ico = [];
      if (firmware.present_in_repo) {
        ico.push(
          <Popup
            key="present_repo"
            content="This firmware is present in the central firmware repository"
            position="top center"
            wide
            trigger={<Icon name="cloud" />}
          />,
        );
      }
      if (firmware.already_downloaded) {
        ico.push(
          <Popup
            key="present_local"
            content="This firmware is present on this local NMS instance"
            position="top center"
            wide
            trigger={<Icon name="disk" />}
          />,
        );
      }
      if (firmware.approved) {
        ico.push(
          <Popup
            key="approved"
            content="This firmware is verified/approved"
            position="top center"
            wide
            trigger={<Icon name="check" color="green" />}
          />,
        );
      } else {
        ico.push(
          <Popup
            key="not_approved"
            content="Warning! This firmware is not verified/approved"
            position="top center"
            wide
            trigger={<Icon name="delete" color="red" />}
          />,
        );
      }
      if (this.isDefaultFirmware(firmware.filename)) {
        ico.push(
          <Popup
            key="default"
            content="This firmware is a default firmware for one or more device types during ZTP"
            position="top center"
            wide
            trigger={<Icon name="star" color="blue" />}
          />,
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
          key={`${index}_content`}
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
                  <td>OS version</td>
                  <td>{firmware.os_version}</td>
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
            <FirmwareCopyForm
              filename={firmware.filename}
              sha1sum={firmware.sha1sum}
              already_downloaded={firmware.already_downloaded}
              isDefaultFirmware={this.isDefaultFirmware(firmware.filename)}
              getFirmwareFiles={this.getFirmwareFiles.bind(this)}
            />
          </td>
        </tr>,
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
                  <th>Firmwares</th>
                </tr>
              </thead>
              <tbody>{firmwareTableBody}</tbody>
            </table>
          </div>
          <h2 hidden={!permissionsCheck("Groups", "read")}>Firmware upgrade</h2>
          <p hidden={!permissionsCheck("Groups", "read")}>
            <a href="/groups">Select a group for firmware upgrade</a>
          </p>
        </div>
      </section>
    );
  }
}

export default FirmwareCopy;
