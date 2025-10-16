import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { Icon, Popup } from "semantic-ui-react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { getData } from "../utils/getData";
import permissionsCheck from "../utils/permissions/permissionsCheck";
import FirmwareCopyForm from "./FirmwareCopyForm";

function PopupPresentInRepo() {
  return (
    <Popup
      content="This firmware is present in the central firmware repository"
      position="top center"
      trigger={<Icon name="cloud" />}
    />
  );
}

function PopupAlreadyDownloaded() {
  return (
    <Popup
      content="This firmware is present on this local NMS instance"
      position="top center"
      trigger={<Icon name="disk" />}
    />
  );
}

function PopupApproved() {
  return (
    <Popup
      content="This firmware is verified/approved"
      position="top center"
      trigger={<Icon name="check" color="green" />}
    />
  );
}

function PopupNotApproved() {
  return (
    <Popup
      content="Warning! This firmware is not verified/approved"
      position="top center"
      trigger={<Icon name="delete" color="red" />}
    />
  );
}

function PopupDefaultFirmware() {
  return (
    <Popup
      content="This firmware is a default firmware for one or more device types during ZTP"
      position="top center"
      wide
      trigger={<Icon name="star" color="blue" />}
    />
  );
}

function FirmwareTableRow({ firmware, index, reloadFirmwareFiles }) {
  const [open, setOpen] = useState(false);

  return (
    <tr key={index} style={{ flexDirection: "column" }}>
      <td key={`${index}_icon`} onClick={() => setOpen((prev) => !prev)}>
        <Icon name={open ? "angle down" : "angle right"} />
        <label style={{ paddingRight: "5px" }}>{firmware.filename}</label>
        {firmware.present_in_repo && <PopupPresentInRepo />}
        {firmware.already_downloaded && <PopupAlreadyDownloaded />}
        {firmware.approved && <PopupApproved />}
        {!firmware.approved && <PopupNotApproved />}
        {firmware.default_to && <PopupDefaultFirmware />}
      </td>
      <td
        key={`${index}_content`}
        colSpan="1"
        className="device_details_row"
        hidden={!open}
        style={{ flexDirection: "column" }}
      >
        <table className="device_details_table">
          <tbody>
            <tr key={`${index}_filename`}>
              <td>Filename</td>
              <td>{firmware.filename}</td>
            </tr>
            <tr key={`${index}_os_version`}>
              <td>OS version</td>
              <td>{firmware.os_version}</td>
            </tr>
            <tr key={`${index}_approved_by`}>
              <td>Approved by</td>
              <td>{firmware.approved_by}</td>
            </tr>
            <tr key={`${index}_approved_date`}>
              <td>Approved date</td>
              <td>{firmware.approved_date}</td>
            </tr>
            <tr key={`${index}_eol_date`}>
              <td>End of life date</td>
              <td>{firmware.end_of_life_date}</td>
            </tr>
            {firmware.linked_to && (
              <tr key={`${index}_linked_to`}>
                <td>Linked to</td>
                <td>{firmware.linked_to}</td>
              </tr>
            )}
            {firmware.default_to && (
              <tr key={`${index}_default_to`}>
                <td>Default link</td>
                <td>{firmware.default_to}</td>
              </tr>
            )}
          </tbody>
        </table>
        <FirmwareCopyForm
          filename={firmware.filename}
          sha1sum={firmware.sha1sum}
          already_downloaded={firmware.already_downloaded}
          defaultFirmware={firmware.default_to}
          linkedTo={firmware.linked_to}
          reloadFirmwareFiles={reloadFirmwareFiles}
        />
      </td>
    </tr>
  );
}

FirmwareTableRow.propTypes = {
  firmware: PropTypes.shape({
    filename: PropTypes.string,
    approved: PropTypes.bool,
    present_in_repo: PropTypes.bool,
    approved_by: PropTypes.string,
    approved_date: PropTypes.string,
    end_of_life_date: PropTypes.string,
    os_version: PropTypes.string,
    already_downloaded: PropTypes.bool,
    default_to: PropTypes.string,
    linked_to: PropTypes.string,
  }),
  index: PropTypes.number,
  reloadFirmwareFiles: PropTypes.func,
};

function FirmwareCopy() {
  const [firmwareData, setFirmwareData] = useState([]);

  const { token } = useAuthToken();

  const mergeFirmwareData = (repoData, nmsData) => {
    const newFirmwareData = [];
    repoData.forEach((firmware) => {
      // Check if file already exist in firmwareData
      const nmsFirmware = nmsData.find(
        (obj) => obj.filename === firmware.filename,
      );

      // if the nmsFirmware does not have already_downloaded we replace with the new one
      if (nmsFirmware) {
        firmware.present_in_repo = true;
        firmware.already_downloaded =
          firmware.already_downloaded || nmsFirmware.already_downloaded;
        firmware.default_to = firmware.default_to || nmsFirmware.default_to;
        firmware.approved = firmware.approved || nmsFirmware.approved;
        firmware.linked_to = firmware.linked_to || nmsFirmware.linked_to;
      }
      newFirmwareData.push(firmware);
    });

    // filter out all files we have already added earlier
    // concat them together
    const filteredFirmwareData = nmsData.filter(
      (firmware) => !repoData.some((f) => f.filename === firmware.filename),
    );

    return newFirmwareData
      .concat(filteredFirmwareData)
      .sort((a, b) => a.filename < b.filename);
  };

  const getFirmwareRepoData = async () => {
    try {
      const data = await getData(process.env.FIRMWARE_REPO_METADATA_URL);
      const repoFirmwares = data.firmwares.map((firmware) => {
        return {
          ...firmware,
          present_in_repo: true,
        };
      });
      return repoFirmwares;
    } catch {
      return [];
    }
  };

  const getFirmwareFiles = async () => {
    try {
      const { data } = await getData(
        `${process.env.API_URL}/api/v1.0/firmware`,
        token,
      );

      const files = data.files ? data.files : [];
      const defaults = data.defaults ? data.defaults : [];

      const mappedFirmwareData = files.map((firmware) => {
        const defaultTo = defaults.find((d) => d.file === firmware)?.default;
        const linkedTo = defaults.find((d) => d.default === firmware)?.file;

        return {
          filename: firmware,
          approved: false,
          present_in_repo: false,
          approved_by: "",
          approved_date: "",
          end_of_life_date: "",
          os_version: "",
          already_downloaded: true,
          default_to: defaultTo,
          linked_to: linkedTo,
        };
      });
      return mappedFirmwareData;
    } catch {
      return [];
    }
  };

  const reloadFirmwareFiles = async () => {
    const firmwareRepoData = await getFirmwareRepoData();
    const firmwareNmsData = await getFirmwareFiles();
    const mergedFirmwareData = mergeFirmwareData(
      firmwareRepoData,
      firmwareNmsData,
    );
    setFirmwareData(mergedFirmwareData);
  };

  useEffect(() => {
    reloadFirmwareFiles();
  }, []);

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
            <tbody>
              {firmwareData.map((firmware, index) => (
                <FirmwareTableRow
                  key={firmware.filename || index}
                  firmware={firmware}
                  index={index}
                  reloadFirmwareFiles={reloadFirmwareFiles}
                />
              ))}
            </tbody>
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

export default FirmwareCopy;
