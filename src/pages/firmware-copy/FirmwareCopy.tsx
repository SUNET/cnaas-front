import { useEffect, useState } from "react";
import {
  Grid,
  GridColumn,
  Icon,
  Loader,
  Popup,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import { useAuthToken } from "../../stores/AuthTokenContext";
import permissionsCheck from "../../utils/permissions/permissionsCheck";
import { FirmwareCopyForm } from "./FirmwareCopyForm";
import {
  type FirmwareFile,
  fetchNmsFirmware,
  fetchRepoFirmware,
  mergeFirmwareData,
} from "./firmwareCopyApi";

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

function FirmwareTableRow({
  firmware,
  reloadFirmwareFiles,
}: {
  readonly firmware: FirmwareFile;
  readonly reloadFirmwareFiles: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow style={{ flexDirection: "column" }}>
        <TableCell onClick={() => setOpen((prev) => !prev)}>
          <Icon name={open ? "angle down" : "angle right"} />
          <label style={{ paddingRight: "5px" }}>{firmware.filename}</label>
          {firmware.present_in_repo && <PopupPresentInRepo />}
          {firmware.already_downloaded && <PopupAlreadyDownloaded />}
          {firmware.approved && <PopupApproved />}
          {!firmware.approved && <PopupNotApproved />}
          {firmware.default_to && <PopupDefaultFirmware />}
        </TableCell>
      </TableRow>
      <TableRow hidden={!open} style={{ flexDirection: "column" }}>
        <TableCell style={{ display: "block" }}>
          <Grid columns={2}>
            <GridColumn>
              <Table compact basic="very" collapsing>
                <TableBody>
                  <TableRow>
                    <TableCell>Filename</TableCell>
                    <TableCell>{firmware.filename}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>OS version</TableCell>
                    <TableCell>{firmware.os_version}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Approved by</TableCell>
                    <TableCell>{firmware.approved_by}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Approved date</TableCell>
                    <TableCell>{firmware.approved_date}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>End of life date</TableCell>
                    <TableCell>{firmware.end_of_life_date}</TableCell>
                  </TableRow>
                  {firmware.linked_to && (
                    <TableRow>
                      <TableCell>Linked to</TableCell>
                      <TableCell>{firmware.linked_to}</TableCell>
                    </TableRow>
                  )}
                  {firmware.default_to && (
                    <TableRow>
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

export function FirmwareCopy() {
  const [firmwareData, setFirmwareData] = useState<FirmwareFile[]>([]);
  const [repoUpdated, setRepoUpdated] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const { token } = useAuthToken();

  const reloadFirmwareFiles = async () => {
    try {
      const repoData = await fetchRepoFirmware();
      const nmsData = await fetchNmsFirmware(token);
      setFirmwareData(mergeFirmwareData(repoData.firmwares, nmsData));
      setRepoUpdated(repoData.updated);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadFirmwareFiles();
  }, []);

  return (
    <section>
      <div id="firmware_list">
        <h2>Firmware</h2>
        {repoUpdated && <p>Firmware repository last updated: {repoUpdated}</p>}
        <div id="data">
          <Table striped>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Firmwares</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell>
                    <Loader active inline="centered">
                      Loading firmware...{" "}
                    </Loader>
                  </TableCell>
                </TableRow>
              ) : (
                firmwareData.map((firmware) => (
                  <FirmwareTableRow
                    key={firmware.filename}
                    firmware={firmware}
                    reloadFirmwareFiles={reloadFirmwareFiles}
                  />
                ))
              )}
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
