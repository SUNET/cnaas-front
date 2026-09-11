import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import WarningIcon from "@mui/icons-material/Warning";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Task } from "../../../components/Task";
import { Tooltip } from "../../../components/Tooltip";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import type { Job } from "../../../types/job";
import { getData } from "../../../utils/getData";
import type { DeviceSyncOptions } from "../api/configChangeApi";
import { DryRunProgressBar } from "./DryRun/DryRunProgressBar";
import { DryRunProgressInfo } from "./DryRun/DryRunProgressInfo";

type ConfirmModeOption = {
  readonly value: number;
  readonly text: string;
};

type ConfigChangeStep4Props = {
  readonly confirmJobId: number | string;
  readonly confirmRunJobStatus: string;
  readonly confirmRunProgressData: Job | null;
  readonly dryRunChangeScore: number | null;
  readonly dryRunJobStatus: string;
  readonly jobId: number | string;
  readonly liveRunJobStatus: string;
  readonly liveRunProgressData: Job | null;
  readonly liveRunSyncStart: (options: DeviceSyncOptions) => void;
  readonly logLines: string[];
  readonly synctoForce: boolean;
  readonly totalCount: number;
};

function createWarningPopups(
  dryRunChangeScore: number | null,
  synctoForce: boolean,
) {
  const warnings = [];

  const warnChangeScore = 90;
  if (dryRunChangeScore != null && dryRunChangeScore > warnChangeScore) {
    warnings.push(
      <Tooltip key="popup2" title={`High change score: ${dryRunChangeScore}`}>
        <WarningIcon fontSize="large" sx={{ color: "orange" }} />
      </Tooltip>,
    );
  }
  if (synctoForce) {
    warnings.push(
      <Tooltip key="popup3" title="Local changes will be overwritten!">
        <WarningIcon fontSize="large" sx={{ color: "error.main" }} />
      </Tooltip>,
    );
  }
  return warnings;
}

export function ConfigChangeStep4({
  confirmJobId,
  confirmRunJobStatus,
  confirmRunProgressData,
  dryRunChangeScore,
  dryRunJobStatus,
  jobId,
  liveRunJobStatus,
  liveRunProgressData,
  liveRunSyncStart,
  logLines,
  synctoForce,
  totalCount,
}: ConfigChangeStep4Props) {
  const [confirmDiagOpen, setConfirmDiagOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(-1);
  const [confirmModeDefault, setConfirmModeDefault] = useState(-1);
  const [confirmModeOptions, setConfirmModeOptions] = useState<
    ConfirmModeOption[]
  >([]);
  // Tracks what the user explicitly picked in the Select, kept separate from
  // `confirmMode` so the placeholder keeps showing until the user chooses,
  // even after the server default has loaded.
  const [selectedConfirmModeOption, setSelectedConfirmModeOption] = useState<
    number | ""
  >("");
  const [jobComment, setJobComment] = useState("");
  const [jobTicketRef, setJobTicketRef] = useState("");
  const missingTicketOrComment = !jobTicketRef && !jobComment;
  const { token } = useAuthToken();

  function okConfirm() {
    setConfirmDiagOpen(false);
    liveRunSyncStart({
      dry_run: false,
      comment: jobComment,
      ticket_ref: jobTicketRef,
      confirm_mode: confirmMode,
    });
    const confirmButtonElem = document.getElementById(
      "confirmButton",
    ) as HTMLButtonElement | null;
    if (confirmButtonElem) {
      confirmButtonElem.disabled = true;
    }
  }

  useEffect(() => {
    if (!token) return;

    async function fetchConfirmModeOptions() {
      const url = `${process.env.API_URL}/api/v1.0/settings/server`;
      try {
        const data = await getData(url, token);
        if (data.api.COMMIT_CONFIRMED_MODE >= 0) {
          setConfirmModeDefault(() => data.api.COMMIT_CONFIRMED_MODE);
          setConfirmMode(() => data.api.COMMIT_CONFIRMED_MODE);
          const initialOptions: ConfirmModeOption[] = [
            { value: -1, text: "use server default commit confirm mode" },
            { value: 0, text: "mode 0: no confirm" },
            { value: 1, text: "mode 1: per-device confirm" },
            { value: 2, text: "mode 2: per-job confirm" },
          ];
          const updatedOptions = initialOptions.map((option) => {
            if (option.value === data.api.COMMIT_CONFIRMED_MODE) {
              return { ...option, text: `${option.text} (server default)` };
            }
            return option;
          });
          setConfirmModeOptions(updatedOptions);
        }
      } catch {
        console.log(
          "API does not support settings/server to get default commit confirm mode",
        );
      }
    }

    fetchConfirmModeOptions();
  }, [token]);

  function updateConfirmMode(value: number) {
    setSelectedConfirmModeOption(value);
    setConfirmMode(value === -1 ? confirmModeDefault : value);
  }

  let commitButtonDisabled = true;
  if (dryRunJobStatus === "FINISHED") {
    commitButtonDisabled = !!liveRunJobStatus;
  }

  const warnings = commitButtonDisabled
    ? []
    : createWarningPopups(dryRunChangeScore, synctoForce);

  return (
    <Task
      title={
        <>
          Commit configuration (4/4)
          <Tooltip title="This will send the newly generated configurations to the targeted devices and activate it. It's a good idea to describe the change or give a ticket reference so you can understand what was the intention when looking in the job history log.">
            <HelpOutlineOutlinedIcon fontSize="small" />
          </Tooltip>
        </>
      }
    >
      <p>Step 4 of 4: Final step, commit new configuration to devices</p>
      <Stack spacing={2}>
        <TextField
          label="Describe the change"
          placeholder="comment"
          size="small"
          onChange={(e) => setJobComment(e.target.value)}
          sx={{ width: "50em", mb: 2 }}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
        <TextField
          label="Service ticket ID reference"
          placeholder="ticket reference"
          size="small"
          onChange={(e) => setJobTicketRef(e.target.value)}
          sx={{ width: "15em", mb: 2 }}
          slotProps={{ htmlInput: { maxLength: 32 } }}
        />
        <FormHelperText
          sx={{
            mt: -1,
            color: "warning.main",
            visibility: missingTicketOrComment ? "visible" : "hidden",
          }}
        >
          Ticket reference or comment missing!
        </FormHelperText>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 2 }}>
        <Button
          id="confirmButton"
          variant="contained"
          color="secondary"
          disabled={commitButtonDisabled}
          onClick={() => setConfirmDiagOpen(true)}
        >
          Deploy change (live run)
        </Button>
        {warnings}
        <Select
          disabled={confirmModeDefault === -1}
          displayEmpty
          size="small"
          value={selectedConfirmModeOption}
          renderValue={(value) =>
            value === ""
              ? "commit confirm mode (use server default)"
              : confirmModeOptions.find((option) => option.value === value)
                  ?.text
          }
          onChange={(e: SelectChangeEvent<number | "">) =>
            updateConfirmMode(e.target.value as number)
          }
        >
          {confirmModeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.text}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <ConfirmDialog
        content="Are you sure you want to commit changes to devices and overwrite any local changes?"
        open={confirmDiagOpen}
        onCancel={() => setConfirmDiagOpen(false)}
        onConfirm={() => okConfirm()}
      />
      <DryRunProgressBar
        dryRunJobStatus={liveRunJobStatus}
        dryRunProgressData={liveRunProgressData}
        totalDevices={totalCount}
        keyNum={1}
      />
      <DryRunProgressInfo
        dryRunJobStatus={liveRunJobStatus}
        dryRunProgressData={liveRunProgressData}
        jobId={jobId}
        logLines={logLines}
        keyNum={1}
      />
      <p hidden={confirmMode !== 2}>Confirm progress: </p>
      <DryRunProgressBar
        hidden={confirmMode !== 2}
        dryRunJobStatus={confirmRunJobStatus}
        dryRunProgressData={confirmRunProgressData}
        totalDevices={totalCount}
        keyNum={2}
      />
      <DryRunProgressInfo
        hidden={confirmMode !== 2}
        dryRunJobStatus={confirmRunJobStatus}
        dryRunProgressData={confirmRunProgressData}
        jobId={confirmJobId}
        logLines={logLines}
        keyNum={2}
      />
    </Task>
  );
}
