import React from "react";
import { Form, Confirm, Input } from "semantic-ui-react";
import FirmwareProgressBar from "./FirmwareProgressBar";
import FirmwareProgressInfo from "./FirmwareProgressInfo";
import FirmwareError from "./FirmwareError";

const dateRegEx = new RegExp(
  "^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})?$",
);

function FirmwareStep3({
  firmwareUpgradeStart,
  firmwareUpgradeAbort,
  filename,
  jobData,
  jobStatus,
  jobId,
  jobFinishedDevices,
  jobResult,
  activateStep3,
  totalCount,
  logLines,
}) {
  const [jobStarted, setJobStarted] = React.useState(false);
  const [confirmDiagOpen, setConfirmDiagOpen] = React.useState(false);
  const [startAt, setStartAt] = React.useState("");
  const [startAtError, setStartAtError] = React.useState(false);

  const openConfirm = React.useCallback(() => {
    setConfirmDiagOpen(true);
  }, []);

  const closeConfirm = React.useCallback(() => {
    setConfirmDiagOpen(false);
  }, []);

  const okConfirm = React.useCallback(() => {
    setConfirmDiagOpen(false);
    setJobStarted(true);
    firmwareUpgradeStart(3, filename, startAt);
  }, [firmwareUpgradeStart, filename, startAt]);

  const onClickStep3Abort = React.useCallback(() => {
    firmwareUpgradeAbort(3);
    const confirmButtonElem = document.getElementById("step3abortButton");
    if (confirmButtonElem) confirmButtonElem.disabled = true;
  }, [firmwareUpgradeAbort]);

  const onUpdateStartAt = React.useCallback((e) => {
    const val = e.target.value;
    setStartAt(val);
    if (dateRegEx.test(val)) {
      setStartAtError(false);
    } else {
      setStartAtError(true);
    }
  }, []);
  let error = "";
  let disableStartButton = true;
  let step3abortDisabled = true;

  if (jobStatus === "EXCEPTION") {
    error = [<FirmwareError devices={jobResult.devices} />];
  } else if (jobStatus === "RUNNING" || jobStatus === "SCHEDULED") {
    step3abortDisabled = false;
  }

  if (jobStarted === true) {
    disableStartButton = true;
  } else if (startAtError === true) {
    disableStartButton = true;
  } else if (activateStep3 === true) {
    disableStartButton = false;
  }

  return (
    <div className="task-container">
      <div className="heading">
        <h2>Reboot devices (3/3)</h2>
        <a href="#">
          <button className="close">Close</button>
        </a>
      </div>
      <div className="task-collapsable">
        <p>
          Step 3 of 3: Reboot devices and check that they start with new
          firmware
        </p>
        <Input
          label={{ basic: true, content: "UTC" }}
          labelPosition="right"
          placeholder="2020-01-30 03:00:00"
          error={startAtError}
          onChange={onUpdateStartAt}
          value={startAt}
          disabled={jobStarted}
        />{" "}
        If left empty devices will reboot immediately
        <Form>
          <div className="info">
            <button
              id="step3button"
              onClick={openConfirm}
              disabled={disableStartButton}
            >
              Start reboots
            </button>
            <button
              id="step3abortButton"
              disabled={step3abortDisabled}
              onClick={onClickStep3Abort}
            >
              Abort!
            </button>
          </div>
        </Form>
        <Confirm
          content="Are you sure you want to (schedule) reboot devices?"
          open={confirmDiagOpen}
          onCancel={closeConfirm}
          onConfirm={okConfirm}
        />
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
      </div>
      {error}
    </div>
  );
}

export default FirmwareStep3;
