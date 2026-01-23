import { useCallback, useEffect, useState } from "react";
import { Confirm, Icon, Input, Popup, Select } from "semantic-ui-react";

import { getData } from "../../utils/getData";
import { DryRunProgressBar } from "./DryRun/DryRunProgressBar";
import { DryRunProgressInfo } from "./DryRun/DryRunProgressInfo";
import { useAuthToken } from "../../contexts/AuthTokenContext";

function createWarningPopups(
  jobTicketRef,
  jobComment,
  dryRunChangeScore,
  synctoForce,
) {
  const warnings = [];

  if (!jobTicketRef && !jobComment) {
    warnings.push(
      <Popup
        key="popup1"
        content="Ticket reference or comment is missing"
        position="top center"
        hoverable
        trigger={<Icon name="warning circle" color="yellow" size="large" />}
      />,
    );
  }
  const warnChangeScore = 90;
  if (dryRunChangeScore && dryRunChangeScore > warnChangeScore) {
    warnings.push(
      <Popup
        key="popup2"
        content={`High change score: ${dryRunChangeScore}`}
        position="top center"
        hoverable
        trigger={<Icon name="warning sign" color="orange" size="large" />}
      />,
    );
  }
  if (synctoForce) {
    warnings.push(
      <Popup
        key="popup3"
        content="Local changes will be overwritten!"
        position="top center"
        hoverable
        trigger={<Icon name="warning sign" color="red" size="large" />}
      />,
    );
  }
  if (!warnings.length) {
    warnings.push(
      <Popup
        key="popup4"
        content="No warnings"
        position="top center"
        hoverable
        trigger={<Icon name="checkmark box" color="green" size="large" />}
      />,
    );
  }

  return warnings;
}

function ConfigChangeStep4({
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
}) {
  const [confirmDiagOpen, setConfirmDiagOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(-1);
  const [confirmModeDefault, setConfirmModeDefault] = useState(-1);
  const [confirmModeOptions, setConfirmModeOptions] = useState([]);
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
    const confirmButtonElem = document.getElementById("confirmButton");
    confirmButtonElem.disabled = true;
  }

  const fetchConfirmModeOptions = useCallback(() => {
    const url = `${process.env.API_URL}/api/v1.0/settings/server`;
    getData(url, token)
      .then((data) => {
        if (data.api.COMMIT_CONFIRMED_MODE >= 0) {
          setConfirmModeDefault(() => data.api.COMMIT_CONFIRMED_MODE);
          setConfirmMode(() => data.api.COMMIT_CONFIRMED_MODE);
          const initialOptions = [
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
      })
      .catch(() => {
        console.log(
          "API does not support settings/server to get default commit confirm mode",
        );
      });
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchConfirmModeOptions();
    }
  }, [token, fetchConfirmModeOptions]);

  function updateConfirmMode(value) {
    setConfirmMode(value !== -1 ? value : confirmModeDefault);
  }

  let commitButtonDisabled = true;
  if (dryRunJobStatus === "FINISHED") {
    commitButtonDisabled = !!liveRunJobStatus;
  }

  const warnings = !commitButtonDisabled
    ? createWarningPopups(
        jobTicketRef,
        jobComment,
        dryRunChangeScore,
        synctoForce,
      )
    : [];

  return (
    <div className="task-container">
      <div className="heading">
        <h2>
          <Icon
            name="dropdown"
            onClick={() => setExpanded((prev) => !prev)}
            rotated={expanded ? null : "counterclockwise"}
          />
          Commit configuration (4/4)
          <Popup
            content="This will send the newly generated configurations to the targeted devices and activate it. It's a good idea to describe the change or give a ticket reference so you can understand what was the intention when looking in the job history log."
            trigger={<Icon name="question circle outline" size="small" />}
            wide="very"
          />
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
            onChange={(_e, data) => setJobComment(data.value)}
          />
        </div>
        <p>Enter service ticket ID reference:</p>
        <Input
          placeholder="ticket reference"
          maxLength="32"
          className="job_ticket_ref"
          error={!jobTicketRef && !jobComment}
          onChange={(_e, data) => setJobTicketRef(data.value)}
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
          disabled={confirmModeDefault == -1}
          placeholder="commit confirm mode (use server default)"
          options={confirmModeOptions}
          onChange={(_e, option) => updateConfirmMode(option.value)}
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
        <p hidden={confirmMode != 2}>Confirm progress: </p>
        <DryRunProgressBar
          hidden={confirmMode != 2}
          dryRunJobStatus={confirmRunJobStatus}
          dryRunProgressData={confirmRunProgressData}
          totalDevices={totalCount}
          keyNum={2}
        />
        <DryRunProgressInfo
          hidden={confirmMode != 2}
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

export default ConfigChangeStep4;
