import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudIcon from "@mui/icons-material/Cloud";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SaveIcon from "@mui/icons-material/Save";
import StarIcon from "@mui/icons-material/Star";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { styled } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Tooltip } from "../../components/Tooltip";
import { useAuthToken } from "../../stores/AuthTokenContext";
import permissionsCheck from "../../utils/permissions/permissionsCheck";
import { FirmwareCopyForm } from "./FirmwareCopyForm";
import {
  fetchNmsFirmware,
  fetchRepoFirmware,
  mergeFirmwareData,
} from "./firmwareCopyApi";
import type { FirmwareFile } from "./types/firmware";
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

const DetailLayout = styled("div")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
  gap: theme.spacing(2),
  padding: theme.spacing(1.75, 0),
}));

function FirmwareMetadataTable({
  firmware,
}: {
  readonly firmware: FirmwareFile;
}) {
  const rows: ReadonlyArray<{ label: string; value: ReactNode }> = [
    { label: "Filename", value: firmware.filename },
    { label: "OS version", value: firmware.os_version },
    { label: "Approved by", value: firmware.approved_by },
    { label: "Approved date", value: firmware.approved_date },
    { label: "End of life date", value: firmware.end_of_life_date },
    ...(firmware.linked_to
      ? [{ label: "Linked to", value: firmware.linked_to }]
      : []),
    ...(firmware.default_to
      ? [{ label: "Default link", value: firmware.default_to }]
      : []),
  ];

  return (
    <Table
      size="small"
      sx={{
        "& td": { border: 0 },
        "& tbody tr:nth-of-type(even)": {
          backgroundColor: "grey.50",
        },
      }}
    >
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell
              sx={{
                fontWeight: 700,
                width: "1%",
                whiteSpace: "nowrap",
                verticalAlign: "top",
              }}
            >
              {row.label}
            </TableCell>
            <TableCell>{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      <TableRow
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          cursor: "pointer",
          "& > .MuiTableCell-root": { borderBottom: "unset" },
          "&:hover": { backgroundColor: "action.selected" },
        }}
      >
        <TableCell>
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
      <TableRow>
        <TableCell sx={{ py: 0, backgroundColor: "background.paper" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <DetailLayout>
              <FirmwareMetadataTable firmware={firmware} />
              <div style={{ paddingTop: 0 }}>
                <FirmwareCopyForm
                  filename={firmware.filename}
                  sha1sum={firmware.sha1sum}
                  sha512sum={firmware.sha512sum}
                  alreadyDownloaded={firmware.already_downloaded}
                  defaultFirmware={firmware.default_to}
                  linkedTo={firmware.linked_to}
                  reloadFirmwareFiles={reloadFirmwareFiles}
                />
              </div>
            </DetailLayout>
          </Collapse>
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
          <TableContainer sx={{ backgroundColor: "grey.100" }}>
            <Table aria-label="Firmwares" size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Firmwares</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell>
                      <CircularProgress
                        size={16}
                        sx={{
                          marginRight: 1,
                          verticalAlign: "middle",
                        }}
                      />
                      Loading firmware...
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
          </TableContainer>
        </div>
        <h2 hidden={!permissionsCheck("Groups", "read")}>Firmware upgrade</h2>
        <p hidden={!permissionsCheck("Groups", "read")}>
          <a href="/groups">Select a group for firmware upgrade</a>
        </p>
      </div>
    </section>
  );
}
