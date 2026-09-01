import { useEffect, useState } from "react";
import {
  Grid,
  GridColumn,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import { Tooltip } from "../../components/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import CloudIcon from "@mui/icons-material/Cloud";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import StarIcon from "@mui/icons-material/Star";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useAuthToken } from "../../stores/AuthTokenContext";
import permissionsCheck from "../../utils/permissions/permissionsCheck";
import { FirmwareCopyForm } from "./FirmwareCopyForm";
import {
  type FirmwareFile,
  fetchNmsFirmware,
  fetchRepoFirmware,
  mergeFirmwareData,
} from "./firmwareCopyApi";
import { useFirmwareCopySocket } from "./useFirmwareCopySocket";

function PopupPresentInRepo() {
  return (
    <Tooltip
      title="This firmware is present in the central firmware repository"
      placement="top"
    >
      <CloudIcon fontSize="small" />
    </Tooltip>
  );
}

function PopupAlreadyDownloaded() {
  return (
    <Tooltip
      title="This firmware is present on this local NMS instance"
      placement="top"
    >
      <SaveIcon fontSize="small" />
    </Tooltip>
  );
}

function PopupApproved() {
  return (
    <Tooltip title="This firmware is verified/approved" placement="top">
      <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
    </Tooltip>
  );
}

function PopupNotApproved() {
  return (
    <Tooltip
      title="Warning! This firmware is not verified/approved"
      placement="top"
    >
      <CancelIcon fontSize="small" sx={{ color: "error.main" }} />
    </Tooltip>
  );
}

function PopupDefaultFirmware() {
  return (
    <Tooltip
      title="This firmware is a default firmware for one or more device types during ZTP"
      placement="top"
    >
      <StarIcon fontSize="small" sx={{ color: "primary.main" }} />
    </Tooltip>
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
          {open ? (
            <KeyboardArrowDownIcon sx={{ verticalAlign: "middle" }} />
          ) : (
            <KeyboardArrowRightIcon sx={{ verticalAlign: "middle" }} />
          )}
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
                alreadyDownloaded={firmware.already_downloaded}
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

  useFirmwareCopySocket(token);

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
                    <CircularProgress size="1em" /> Loading firmware...
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
