import { useEffect, useState } from "react";
import { Confirm, Icon, Input, Select } from "semantic-ui-react";
import type { InputOnChangeData } from "semantic-ui-react";
import { Tooltip } from "../../../components/Tooltip";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

import { getData } from "../../../utils/getData";
import { DryRunProgressBar } from "./DryRun/DryRunProgressBar";
import { DryRunProgressInfo } from "./DryRun/DryRunProgressInfo";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import type { DeviceSyncOptions } from "../api/configChangeApi";
import type { Job } from "../../../types/job";

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
  jobTicketRef: string,
  jobComment: string,
  dryRunChangeScore: number | null,
  synctoForce: boolean,
) {
  const warnings = [];

  if (!jobTicketRef && !jobComment) {
    warnings.push(
      <Tooltip key="popup1" title="Ticket reference or comment is missing">
        <ErrorIcon fontSize="large" sx={{ color: "warning.main" }} />
      </Tooltip>,
    );
  }
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
  if (!warnings.length) {
    warnings.push(
      <Tooltip key="popup4" title="No warnings">
        <CheckBoxIcon fontSize="large" sx={{ color: "success.main" }} />
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
  const [expanded, setExpanded] = useState(true);
  const [jobComment, setJobComment] = useState("");
  const [jobTicketRef, setJobTicketRef] = useState("");
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
    setConfirmMode(value === -1 ? confirmModeDefault : value);
  }

  let commitButtonDisabled = true;
  if (dryRunJobStatus === "FINISHED") {
    commitButtonDisabled = !!liveRunJobStatus;
  }

  const warnings = commitButtonDisabled
    ? []
    : createWarningPopups(
        jobTicketRef,
        jobComment,
        dryRunChangeScore,
        synctoForce,
      );

  return (
    <div className="task-container">
      <div className="heading">
        <h2>
          <Icon
            name="dropdown"
            onClick={() => setExpanded((prev) => !prev)}
            rotated={expanded ? undefined : "counterclockwise"}
          />
          Commit configuration (4/4)
          <Tooltip title="This will send the newly generated configurations to the targeted devices and activate it. It's a good idea to describe the change or give a ticket reference so you can understand what was the intention when looking in the job history log.">
            <HelpOutlineOutlinedIcon fontSize="small" />
          </Tooltip>
        </h2>
      </div>
      <div className="task-collapsable" hidden={!expanded}>
        <p>Step 4 of 4: Final step, commit new configuration to devices</p>
        <p>Describe the change:</p>
        <div className="info">
          <Input
            placeholder="comment"
            maxLength="255"
            className="job_comment"
            error={!jobTicketRef && !jobComment}
            onChange={(_e: unknown, data: InputOnChangeData) =>
              setJobComment(data.value)
            }
          />
        </div>
        <p>Enter service ticket ID reference:</p>
        <Input
          placeholder="ticket reference"
          maxLength="32"
          className="job_ticket_ref"
          error={!jobTicketRef && !jobComment}
          onChange={(_e: unknown, data: InputOnChangeData) =>
            setJobTicketRef(data.value)
          }
        />
        <br />
        <button
          id="confirmButton"
          type="button"
          disabled={commitButtonDisabled}
          onClick={() => setConfirmDiagOpen(true)}
        >
          Deploy change (live run)
        </button>{" "}
        {warnings}
        <Select
          disabled={confirmModeDefault === -1}
          placeholder="commit confirm mode (use server default)"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Semantic UI Select types expect string values but we use numbers
          options={confirmModeOptions as any}
          onChange={(_e, option) => updateConfirmMode(option.value as number)}
        />
        <Confirm
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
      </div>
    </div>
  );
}
