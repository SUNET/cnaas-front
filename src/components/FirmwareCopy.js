import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import {
  Grid,
  GridColumn,
  Icon,
  Popup,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
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
    <>
      <TableRow key={index} style={{ flexDirection: "column" }}>
        <TableCell key={`${index}_icon`} onClick={() => setOpen((prev) => !prev)}>
          <Icon name={open ? "angle down" : "angle right"} />
          <label style={{ paddingRight: "5px" }}>{firmware.filename}</label>
          {firmware.present_in_repo && <PopupPresentInRepo />}
          {firmware.already_downloaded && <PopupAlreadyDownloaded />}
          {firmware.approved && <PopupApproved />}
          {!firmware.approved && <PopupNotApproved />}
          {firmware.default_to && <PopupDefaultFirmware />}
        </TableCell>
      </TableRow>
      <TableRow
        key={`${index}_content`}
        hidden={!open}
        style={{ flexDirection: "column" }}
      >
        <TableCell style={{ display: "block" }}>
          <Grid columns={2}>
            <GridColumn>
              <Table compact basic={"very"} collapsing>
                <TableBody>
                  <TableRow key={`${index}_filename`}>
                    <TableCell>Filename</TableCell>
                    <TableCell>{firmware.filename}</TableCell>
                  </TableRow>
                  <TableRow key={`${index}_os_version`}>
                    <TableCell>OS version</TableCell>
                    <TableCell>{firmware.os_version}</TableCell>
                  </TableRow>
                  <TableRow key={`${index}_approved_by`}>
                    <TableCell>Approved by</TableCell>
                    <TableCell>{firmware.approved_by}</TableCell>
                  </TableRow>
                  <TableRow key={`${index}_approved_date`}>
                    <TableCell>Approved date</TableCell>
                    <TableCell>{firmware.approved_date}</TableCell>
                  </TableRow>
                  <TableRow key={`${index}_eol_date`}>
                    <TableCell>End of life date</TableCell>
                    <TableCell>{firmware.end_of_life_date}</TableCell>
                  </TableRow>
                  {firmware.linked_to && (
                    <TableRow key={`${index}_linked_to`}>
                      <TableCell>Linked to</TableCell>
                      <TableCell>{firmware.linked_to}</TableCell>
                    </TableRow>
                  )}
                  {firmware.default_to && (
                    <TableRow key={`${index}_default_to`}>
                      <TableCell>Default link</TableCell>
                      <TableCell>{firmware.default_to}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </GridColumn>
            <GridColumn width={16} style={{ paddingTop: 0 }}>
              <FirmwareCopyForm
                filename={firmware.filename}
                sha1sum={firmware.sha1sum}
                already_downloaded={firmware.already_downloaded}
                defaultFirmware={firmware.default_to}
                linkedTo={firmware.linked_to}
                reloadFirmwareFiles={reloadFirmwareFiles}
              />
            </GridColumn>
          </Grid>
        </TableCell>
      </TableRow>
    </>
  );
}

FirmwareTableRow.propTypes = {
  firmware: PropTypes.shape({
    filename: PropTypes.string,
    approved: PropTypes.bool,
    sha1sum: PropTypes.string,
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
    for (const firmware of repoData) {
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
    }

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
        <h2>Firmware</h2>
        <div id="data">
          <Table striped>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Firmwares</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firmwareData.map((firmware, index) => (
                <FirmwareTableRow
                  key={firmware.filename || index}
                  firmware={firmware}
                  index={index}
                  reloadFirmwareFiles={reloadFirmwareFiles}
                />
              ))}
            </TableBody>
          </Table>
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
