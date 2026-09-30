import AddBoxIcon from "@mui/icons-material/AddBox";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/Check";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import LinkIcon from "@mui/icons-material/Link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import WarningIcon from "@mui/icons-material/Warning";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { Link, useNavigate } from "react-router";

import { DeviceInfoTable } from "../../../components/DeviceInfoTable";
import { showToast } from "../../../components/toast";
import { Tooltip } from "../../../components/Tooltip";
import { useInterfaceConfigSocket } from "../hooks/useInterfaceConfigSocket";
import { useInterfaceConfig } from "../stores/InterfaceConfigContext";
import { BgpNeighborModal } from "./BgpNeighborModal/BgpNeighborModal";
import { CommitModalAccess, CommitModalDist } from "./CommitModal";
import { ImportInterfaceModal } from "./ImportInterfaceModal";
import { InterfaceTableRow } from "./InterfaceTableRow/InterfaceTableRow";
import { NewInterfaceModal } from "./NewInterface";

// --- Constants ---

// Footer toolbar: spaces the save/refresh/verify action buttons and wraps
// them on narrow viewports.
const FooterToolbar = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1.75),
  alignItems: "center",
}));

const ALLOWED_COLUMNS_ACCESS: Record<string, string> = {
  vlans: "VLANs",
  tags: "Tags",
  json: "Raw JSON",
  aggregate_id: "LACP aggregate ID",
  bpdu_filter: "BPDU filter",
};

const ALLOWED_COLUMNS_DIST: Record<string, string> = {
  vlans: "VLANs",
  tags: "Tags",
  aggregate_id: "LACP aggregate ID",
  config: "Custom config",
};

const ALLOWED_COLUMNS_MAP: Record<string, Record<string, string>> = {
  ACCESS: ALLOWED_COLUMNS_ACCESS,
  DIST: ALLOWED_COLUMNS_DIST,
};

// Fixed column widths, paired with `table-layout: fixed` on the table below,
// so a row's content (e.g. VLAN chips collapsing/expanding) never causes
// other columns to visibly resize.
const COLUMN_WIDTHS: Record<string, string> = {
  name: "9%",
  description: "18%",
  ifclass: "18%",
  vlans: "28%",
  tags: "18%",
  json: "4%",
  aggregate_id: "13%",
  bpdu_filter: "9%",
  config: "18%",
};

// --- Props ---

type InterfaceConfigProps = {
  readonly hostname: string;
};

// --- Component ---

export function InterfaceConfig({ hostname }: InterfaceConfigProps) {
  const navigate = useNavigate();
  const {
    state,
    dispatch,
    awaitingSync,
    reloadAllData,
    refreshInterfaceStatus,
    loadInterfaces,
    updateField,
    toggleUntagged,
    addTagOption,
    addPortTemplateOption,
    addNewInterface,
    setDisplayColumns,
    saveInterfaces,
    startAutoPush,
    bounceInterface,
    exportInterfaces,
    verifyLinknets,
  } = useInterfaceConfig();

  // Connect socket
  useInterfaceConfigSocket({ dispatch, state, awaitingSync, reloadAllData });

  // --- Toast notifications for socket-driven state changes ---

  const prevSynchronized = useRef(state.synchronized);
  const prevThirdPartyUpdate = useRef(state.thirdPartyUpdate);

  useEffect(() => {
    const wasSync = prevSynchronized.current;
    prevSynchronized.current = state.synchronized;

    if (
      !state.isWorking &&
      !state.ownUpdateInProgress &&
      wasSync !== null &&
      state.synchronized !== null &&
      wasSync !== state.synchronized
    ) {
      showToast({
        severity: "warning",
        title: "Synchronized state was changed!",
        message: `Device state was changed to ${String(state.synchronized)} by a third party.`,
      });
    }
  }, [state.synchronized, state.isWorking]);

  useEffect(() => {
    const wasThirdParty = prevThirdPartyUpdate.current;
    prevThirdPartyUpdate.current = state.thirdPartyUpdate;

    if (!wasThirdParty && state.thirdPartyUpdate) {
      showToast({
        severity: "warning",
        title: "Device was updated elsewhere!",
        message: state.updatedBy
          ? `Device has been updated by ${state.updatedBy}, this page is out of sync.`
          : "Device has been updated by a third party, this page is out of sync.",
      });
    }
  }, [state.thirdPartyUpdate]);

  // --- Local UI state (not shared) ---

  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(
    null,
  );

  // --- Derived values ---

  const { device } = state;
  const deviceType = device?.device_type;
  const synchronized = state.synchronized;
  const allowedColumns = (deviceType && ALLOWED_COLUMNS_MAP[deviceType]) || {};
  const commitAutopushDisabled =
    state.isWorking || state.thirdPartyUpdate || !synchronized;

  // --- Callbacks ---

  const handleUpdateFieldData = useCallback(
    (_e: SyntheticEvent | Event, data: Record<string, unknown>) => {
      const nameStr = data.name as string;
      const [field, interfaceName] = nameStr.split("|", 2);
      const defaultValue =
        "defaultChecked" in data ? data.defaultChecked : data.defaultValue;
      let val: unknown = "defaultChecked" in data ? data.checked : data.value;

      if (
        deviceType === "DIST" &&
        ["untagged_vlan", "tagged_vlan_list"].includes(field)
      ) {
        if (Array.isArray(data.value)) {
          val = (data.value as string[]).map((opt) => {
            const options = data.options as Array<{
              value: string;
              description: string;
            }>;
            const found = options.find((e) => e.value === opt);
            return found ? found.description : opt;
          });
        } else {
          const options = data.options as Array<{
            value: string;
            description: string;
          }>;
          const found = options.find((e) => e.value === data.value);
          val = found ? found.description : data.value;
        }
      }

      if (field === "aggregate_id") {
        val = Number.parseInt(val as string, 10);
        if (Number.isNaN(val as number)) val = null;
      }

      updateField(interfaceName, field, val, defaultValue);
    },
    [deviceType, updateField],
  );

  const handleUntaggedClick = useCallback(
    (_e: SyntheticEvent, data: Record<string, unknown>) => {
      toggleUntagged(data.id as string, data.name === "untagged");
    },
    [toggleUntagged],
  );

  const handleAccordionChange = (index: number) => {
    setAccordionActiveIndex((prev) => (prev === index ? -1 : index));
  };

  const handleColumnChange = (
    _e: SyntheticEvent,
    data: { checked?: boolean; name?: string },
  ) => {
    const columnOrder = Object.keys(allowedColumns);
    const next = [...state.displayColumns];

    if (data.checked && data.name && !next.includes(data.name)) {
      next.push(data.name);
    } else if (!data.checked && data.name) {
      const idx = next.indexOf(data.name);
      if (idx > -1) next.splice(idx, 1);
    }

    next.sort((a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b));
    setDisplayColumns(next);
  };

  const closeSaveModal = () => {
    setSaveModalOpen(false);
    setErrorMessage(null);
    setAccordionActiveIndex(0);
  };

  // --- Save & commit ---

  const prepareSendJson = (): Record<string, unknown> => {
    const sendData: { interfaces: Record<string, Record<string, unknown>> } = {
      interfaces: {},
    };

    Object.entries(state.interfaceDataUpdated).forEach(
      ([interfaceName, formData]) => {
        const topLevelKeys: Record<string, unknown> = {};
        const dataLevelKeys: Record<string, unknown> = {};

        Object.entries(formData).forEach(([formKey, formValue]) => {
          if (formKey === "configtype") {
            topLevelKeys[formKey] = formValue;
          } else {
            dataLevelKeys[formKey] = formValue;
          }
        });

        if (Object.keys(dataLevelKeys).length >= 1) {
          topLevelKeys.data = dataLevelKeys;
        }

        sendData.interfaces[interfaceName] = topLevelKeys;
      },
    );

    return sendData;
  };

  const prepareYaml = (): Record<string, unknown> => {
    const sendData: { interfaces: Record<string, unknown>[] } = {
      interfaces: [],
    };

    Object.entries(state.interfaceDataUpdated).forEach(
      ([interfaceName, formData]) => {
        const ifData: Record<string, unknown> = { name: interfaceName };

        const prevIntf = state.interfaces.find(
          (intf) => intf.name === interfaceName,
        );

        if (prevIntf) {
          Object.entries(prevIntf).forEach(([prevKey, prevValue]) => {
            if (
              prevKey === "indexnum" ||
              prevValue === null ||
              prevValue === "" ||
              (prevKey === "redundant_link" && prevValue === true) ||
              prevKey === "data"
            ) {
              // skip
            } else {
              ifData[prevKey] = prevValue;
            }
          });
        }

        let skipIfClass = false;
        Object.entries(formData).forEach(([formKey, formValue]) => {
          if (formKey === "port_template") {
            if (
              formData.ifclass === "port_template" ||
              !("ifclass" in formData)
            ) {
              ifData.ifclass = `port_template_${formValue}`;
              skipIfClass = true;
            }
          } else if (formKey === "ifclass" && !skipIfClass) {
            ifData.ifclass = formData.ifclass;
          } else {
            ifData[formKey] = formValue;
          }
        });

        sendData.interfaces.push(ifData);
      },
    );

    return sendData;
  };

  const saveAndCommitChanges = async () => {
    const { success, error } = await saveInterfaces(prepareSendJson());
    if (success) {
      void startAutoPush();
      setAccordionActiveIndex(3);
    } else {
      setErrorMessage(error ?? null);
      setAccordionActiveIndex(2);
    }
  };

  const saveChanges = async () => {
    const { success, error } = await saveInterfaces(prepareSendJson());
    if (success) {
      void navigate(
        `/config-change?hostname=${hostname}&scrollTo=dry_run&autoDryRun=true`,
      );
    } else {
      setErrorMessage(error ?? null);
      setAccordionActiveIndex(2);
    }
  };

  const gotoConfigChange = () => {
    void navigate(`/config-change?hostname=${hostname}&scrollTo=refreshrepo`);
  };

  // --- Render helpers ---

  const autoPushJobsHTML: ReactNode[] = state.autoPushJobs.map((job, index) => {
    let jobIcon: ReactNode = null;
    if (job.status === "RUNNING") {
      jobIcon = <CircularProgress size="1em" />;
    } else if (job.status === "FINISHED") {
      jobIcon = <CheckIcon sx={{ color: "success.main" }} />;
    } else {
      jobIcon = <CancelIcon sx={{ color: "error.main" }} />;
    }

    const label = index === 0 ? "Dry run" : "Live run";
    return (
      <li key={job.job_id}>
        {label} (job ID {job.job_id}) status: {job.status} {jobIcon}
      </li>
    );
  });

  const unusedInterfaces = state.interfaceStatus
    ? Object.keys(state.interfaceStatus).filter(
        (ifName) =>
          !state.interfaces.some(
            (obj) => obj.name.toLowerCase() === ifName.toLowerCase(),
          ),
      )
    : [];

  const columnHeaders = state.displayColumns.map((col) => (
    <TableCell key={col} sx={{ width: COLUMN_WIDTHS[col] }}>
      {allowedColumns[col]}
    </TableCell>
  ));

  const columnSelectors = Object.keys(allowedColumns).map((col) => {
    const checked = state.displayColumns.includes(col);
    const disabled = Object.values(state.interfaceDataUpdated).some(
      (ifData: Record<string, unknown>) => Object.keys(ifData).includes(col),
    );
    return (
      <li key={col}>
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              disabled={disabled}
              name={col}
              onChange={(e) =>
                handleColumnChange(e, { name: col, checked: e.target.checked })
              }
            />
          }
          label={allowedColumns[col]}
        />
      </li>
    );
  });

  // --- Commit modal content ---

  let commitModal: ReactNode = null;
  if (deviceType === "ACCESS") {
    commitModal = (
      <CommitModalAccess
        accordionActiveIndex={accordionActiveIndex}
        onAccordionChange={handleAccordionChange}
        autoPushJobsHTML={autoPushJobsHTML}
        errorMessage={errorMessage}
        interfaceDataUpdatedJSON={prepareSendJson()}
      />
    );
  } else if (deviceType === "DIST") {
    commitModal = (
      <CommitModalDist hostname={hostname} ifDataYaml={prepareYaml()} />
    );
  }

  // --- JSX ---

  return (
    <section>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          py: 2,
        }}
      >
        <h2>Interface configuration for {hostname}</h2>

        {device && (
          <details>
            <summary>Device details</summary>
            <DeviceInfoTable
              device={device}
              model={state.netboxModel}
              netboxDevice={state.netboxDevice}
            />
          </details>
        )}

        {state.mlagPeerHostname && (
          <p>
            MLAG peer hostname:{" "}
            <Link to={`/interface-config?hostname=${state.mlagPeerHostname}`}>
              {state.mlagPeerHostname}
            </Link>
          </p>
        )}

        <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
          Sync state:
          {synchronized ? (
            <CheckIcon sx={{ color: "success.main" }} />
          ) : (
            <CancelIcon sx={{ color: "error.main" }} />
          )}
        </Stack>

        {!synchronized && (
          <p>
            <WarningIcon sx={{ color: "warning.main", fontSize: "2em" }} />
            Device is not synchronized, use dry_run and verify diff to apply
            changes.
          </p>
        )}

        {state.thirdPartyUpdate && (
          <p>
            <WarningIcon sx={{ color: "warning.main", fontSize: "2em" }} />
            Device has been updated
            {state.updatedBy ? ` by ${state.updatedBy}` : " by a third party"}.
            Reload page to get the latest changes (local changes will be lost).{" "}
            <Button size="small" variant="contained" onClick={reloadAllData}>
              Refresh Data
            </Button>
          </p>
        )}

        {deviceType === "DIST" && device && process.env.GNMI_PROXY_URL && (
          <span>
            <BgpNeighborModal
              hostname={device.hostname}
              managementIp={device.management_ip ?? ""}
              platform={device.platform ?? ""}
            />
          </span>
        )}

        <div className="table_options">
          <IconButton
            className="table_options_button"
            size="small"
            title="Select Columns"
            onClick={(e: SyntheticEvent) =>
              setColumnsAnchorEl(e.currentTarget as HTMLElement)
            }
          >
            <ViewColumnIcon />
          </IconButton>
          <Popover
            open={Boolean(columnsAnchorEl)}
            anchorEl={columnsAnchorEl}
            onClose={() => setColumnsAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Box sx={{ p: 2 }}>
              <p>Show extra columns:</p>
              <ul>{columnSelectors}</ul>
            </Box>
          </Popover>

          {deviceType === "ACCESS" && (
            <>
              <Tooltip
                key="export_interface_config"
                title="Export interface configuration as downloadable JSON file"
                placement="bottom-end"
              >
                <IconButton
                  className="table_options_button"
                  size="small"
                  title="Export interface configuration"
                  onClick={() => exportInterfaces(hostname)}
                >
                  <FileUploadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip
                key="import_interface_config"
                title="Import interface configuration from a JSON file"
                placement="bottom-end"
              >
                <IconButton
                  className="table_options_button"
                  size="small"
                  title="Import interface configuration"
                  onClick={() => setImportModalOpen(true)}
                >
                  <AddBoxIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>

        <TableContainer>
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ whiteSpace: "nowrap", width: COLUMN_WIDTHS.name }}
                >
                  Name
                </TableCell>
                <TableCell sx={{ width: COLUMN_WIDTHS.description }}>
                  Description
                </TableCell>
                <TableCell sx={{ width: COLUMN_WIDTHS.ifclass }}>
                  {deviceType === "DIST" ? "Interface class" : "Configtype"}
                </TableCell>
                {columnHeaders}
              </TableRow>
            </TableHead>

            <TableBody>
              {state.interfaces.map((item, index) => (
                <InterfaceTableRow
                  key={item.name}
                  item={item}
                  index={index}
                  updateFieldData={handleUpdateFieldData}
                  addTagOption={(
                    _e: SyntheticEvent,
                    data: Record<string, unknown>,
                  ) => addTagOption(data.value as string)}
                  addPortTemplateOption={(
                    _e: SyntheticEvent,
                    data: Record<string, unknown>,
                  ) => addPortTemplateOption(data.value as string)}
                  submitBounce={() => bounceInterface(item.name)}
                  untaggedClick={handleUntaggedClick}
                />
              ))}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell colSpan={3 + state.displayColumns.length}>
                  <FooterToolbar>
                    <Button
                      variant="contained"
                      endIcon={<OpenInNewIcon />}
                      onClick={() => setSaveModalOpen(true)}
                    >
                      Save & commit...
                    </Button>
                    <Dialog
                      aria-labelledby="interface-save-commit-dialog"
                      aria-describedby="interface-save-commit-dialog-description"
                      onClose={closeSaveModal}
                      open={saveModalOpen}
                    >
                      <DialogTitle id="interface-save-commit-dialog">
                        Save & commit
                      </DialogTitle>
                      {commitModal}
                      <DialogActions>
                        <Button
                          key="close"
                          variant="outlined"
                          color="inherit"
                          onClick={closeSaveModal}
                        >
                          Close
                        </Button>
                        {deviceType === "ACCESS" && [
                          <Button
                            key="access_button_saveandcommit"
                            onClick={saveAndCommitChanges}
                            disabled={commitAutopushDisabled}
                            variant="contained"
                            color="secondary"
                          >
                            Save and commit now
                          </Button>,
                          <Button
                            key="access_button_dryrun"
                            onClick={saveChanges}
                            disabled={state.isWorking}
                            variant="contained"
                            color="success"
                          >
                            Save and dry run...
                          </Button>,
                        ]}
                        {deviceType === "DIST" && (
                          <Button
                            key="dist_button_dryrun"
                            onClick={gotoConfigChange}
                            variant="contained"
                            color="success"
                          >
                            Start dry run...
                          </Button>
                        )}
                      </DialogActions>
                    </Dialog>
                    <Button
                      variant="contained"
                      endIcon={<RefreshIcon />}
                      onClick={refreshInterfaceStatus}
                    >
                      Refresh interface status
                    </Button>
                    <Button
                      variant="contained"
                      endIcon={<LinkIcon />}
                      onClick={verifyLinknets}
                    >
                      Verify linknets
                    </Button>
                    {deviceType === "DIST" && (
                      <NewInterfaceModal
                        suggestedInterfaces={unusedInterfaces}
                        addNewInterface={addNewInterface}
                      />
                    )}
                  </FooterToolbar>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>

        <ImportInterfaceModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          hostname={hostname}
          getInterfaceData={loadInterfaces}
        />
      </Box>
    </section>
  );
}
