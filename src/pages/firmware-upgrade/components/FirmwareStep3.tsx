import { useCallback, useState, type ChangeEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Tooltip } from "../../../components/Tooltip";
import { FirmwareProgressBar } from "./FirmwareProgressBar";
import { FirmwareProgressInfo } from "./FirmwareProgressInfo";
import { FirmwareError } from "./FirmwareError";
import {
  fetchStaggeredSteps,
  getExceptionDevices,
} from "../api/firmwareUpgradeApi";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";
import { Task } from "../../../components/Task";

const dateRegEx = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})?$/;

export function FirmwareStep3() {
  const { token } = useAuthToken();
  const {
    step3: { jobId, jobData, totalCount },
    filename,
    activateStep3,
    logLines,
    commitTarget,
    firmwareUpgradeStart,
    firmwareUpgradeAbort,
  } = useFirmwareUpgrade();

  const jobStatus = jobData?.status ?? null;
  const jobResult = jobData?.result ?? null;
  const jobFinishedDevices = jobData?.finished_devices ?? null;

  const [jobStarted, setJobStarted] = useState(false);
  const [confirmDiagOpen, setConfirmDiagOpen] = useState(false);
  const [confirmStaggeredDiagOpen, setConfirmStaggeredDiagOpen] =
    useState(false);
  const [startAt, setStartAt] = useState("");
  const [startAtError, setStartAtError] = useState(false);
  const [staggeredSteps, setStaggeredSteps] = useState<ReactNode>(null);
  const [staggeredCompatible, setStaggeredCompatible] = useState(false);

  const openConfirm = useCallback(() => {
    setConfirmDiagOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDiagOpen(false);
  }, []);

  const closeStaggeredConfirm = useCallback(() => {
    setConfirmStaggeredDiagOpen(false);
  }, []);

  const okConfirm = useCallback(() => {
    setConfirmDiagOpen(false);
    setJobStarted(true);
    firmwareUpgradeStart(3, filename ?? null, startAt, false);
  }, [firmwareUpgradeStart, filename, startAt]);

  const okStaggeredConfirm = useCallback(() => {
    setConfirmStaggeredDiagOpen(false);
    setJobStarted(true);
    firmwareUpgradeStart(3, filename ?? null, startAt, true);
  }, [firmwareUpgradeStart, filename, startAt]);

  const onClickStep3Abort = useCallback(() => {
    firmwareUpgradeAbort(3);
    const confirmButtonElem = document.getElementById("step3abortButton");
    if (confirmButtonElem instanceof HTMLButtonElement) {
      confirmButtonElem.disabled = true;
    }
  }, [firmwareUpgradeAbort]);

  const onUpdateStartAt = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartAt(val);
    if (dateRegEx.test(val)) {
      setStartAtError(false);
    } else {
      setStartAtError(true);
    }
  }, []);

  const getStaggeredSteps = useCallback(async () => {
    try {
      setStaggeredSteps(<Typography>Loading staggered steps...</Typography>);
      const groups = await fetchStaggeredSteps(commitTarget.group ?? "", token);
      const stepElements: ReactNode[] = [];
      // enumerate groups and add step <index> to stepElements
      for (const [index, group] of groups.entries()) {
        stepElements.push(
          <Typography key={`stepheader${index}`} variant="h6" component="h2">
            Step {index + 1}
          </Typography>,
        );
        const devicesElements: ReactNode[] = [];
        for (const device of group) {
          devicesElements.push(<li key={device}>{device}</li>);
        }
        stepElements.push(<ul key={`steplist${index}`}>{devicesElements}</ul>);
      }
      setStaggeredSteps(stepElements);
      setStaggeredCompatible(true);
    } catch (error) {
      if (error instanceof Response && error.status === 400) {
        const errorMessage = await error.json();
        setStaggeredSteps(
          <Typography>
            Error fetching staggered steps: {errorMessage.message}
          </Typography>,
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        setStaggeredSteps(
          <Typography>Error fetching staggered steps: {message}</Typography>,
        );
      }
    }
  }, [token, commitTarget]);

  const openStaggeredConfirm = useCallback(() => {
    setConfirmStaggeredDiagOpen(true);
    getStaggeredSteps();
  }, [getStaggeredSteps]);

  let disableStartButton = true;
  let disableStaggeredButton = true;

  const error =
    jobStatus === "EXCEPTION" ? (
      <FirmwareError key="exception" devices={getExceptionDevices(jobResult)} />
    ) : null;

  const step3abortDisabled = !(
    jobStatus === "RUNNING" || jobStatus === "SCHEDULED"
  );

  if (
    jobStarted === false &&
    startAtError === false &&
    activateStep3 === true
  ) {
    disableStartButton = false;
    disableStaggeredButton = false;
  }

  if (commitTarget.group === undefined) {
    disableStaggeredButton = true;
  }

  return (
    <Task title="Reboot devices (3/3)">
      <Typography>
        Step 3 of 3: Reboot devices and check that they start with new firmware
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          placeholder="2020-01-30 03:00:00"
          error={startAtError}
          onChange={onUpdateStartAt}
          value={startAt}
          disabled={jobStarted}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">UTC</InputAdornment>,
            },
          }}
        />
        <Typography>If left empty devices will reboot immediately</Typography>
      </Stack>
      <Box component="form">
        <Stack direction="row" spacing={2} sx={{ alignItems: "baseline" }}>
          <Button
            id="step3button"
            variant="contained"
            onClick={openConfirm}
            disabled={disableStartButton}
          >
            Start reboots
          </Button>
          <Tooltip title="Only for groups of ACCESS only devices. Will reboot devices in steps to minimize impact.">
            <Button
              id={"step3buttonStaggered"}
              variant="contained"
              onClick={openStaggeredConfirm}
              disabled={disableStaggeredButton}
            >
              Staggered reboots...
            </Button>
          </Tooltip>
          <Button
            id="step3abortButton"
            variant="contained"
            color="error"
            disabled={step3abortDisabled}
            onClick={onClickStep3Abort}
          >
            Abort!
          </Button>
        </Stack>
      </Box>
      <ConfirmDialog
        content="Are you sure you want to (schedule) reboot devices?"
        open={confirmDiagOpen}
        onCancel={closeConfirm}
        onConfirm={okConfirm}
      />
      <Dialog
        open={confirmStaggeredDiagOpen}
        onClose={closeStaggeredConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Staggered Reboots Steps</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to (schedule) reboot devices in the following
            steps?
          </Typography>
          {staggeredSteps}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeStaggeredConfirm}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={okStaggeredConfirm}
            disabled={!staggeredCompatible}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      <FirmwareProgressBar
        jobStatus={jobStatus}
        jobFinishedDevices={jobFinishedDevices}
        totalCount={totalCount}
      />
      <FirmwareProgressInfo
        jobStatus={jobStatus}
        jobId={jobId}
        jobData={jobData}
        logLines={logLines}
      />
      {error}
    </Task>
  );
}
