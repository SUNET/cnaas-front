import PropTypes from "prop-types";
import React from "react";
import {
  Form,
  Confirm,
  Input,
  Popup,
  Modal,
  ModalHeader,
  ModalContent,
  ModalActions,
  Button,
} from "semantic-ui-react";
import FirmwareProgressBar from "./FirmwareProgressBar";
import FirmwareProgressInfo from "./FirmwareProgressInfo";
import FirmwareError from "./FirmwareError";
import { postData } from "../../utils/sendData";
import { useAuthToken } from "../../contexts/AuthTokenContext";

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
  commitTarget,
}) {
  const { token } = useAuthToken();

  const [jobStarted, setJobStarted] = React.useState(false);
  const [confirmDiagOpen, setConfirmDiagOpen] = React.useState(false);
  const [confirmStaggeredDiagOpen, setConfirmStaggeredDiagOpen] =
    React.useState(false);
  const [startAt, setStartAt] = React.useState("");
  const [startAtError, setStartAtError] = React.useState(false);
  const [staggeredSteps, setStaggeredSteps] = React.useState(null);
  const [staggeredCompatible, setStaggeredCompatible] = React.useState(false);

  const openConfirm = React.useCallback(() => {
    setConfirmDiagOpen(true);
  }, []);

  const closeConfirm = React.useCallback(() => {
    setConfirmDiagOpen(false);
  }, []);

  const openStaggeredConfirm = React.useCallback(() => {
    setConfirmStaggeredDiagOpen(true);
    getStaggeredSteps();
  }, []);

  const closeStaggeredConfirm = React.useCallback(() => {
    setConfirmStaggeredDiagOpen(false);
  }, []);

  const okConfirm = React.useCallback(() => {
    setConfirmDiagOpen(false);
    setJobStarted(true);
    firmwareUpgradeStart(3, filename, startAt, false);
  }, [firmwareUpgradeStart, filename, startAt]);

  const okStaggeredConfirm = React.useCallback(() => {
    setConfirmStaggeredDiagOpen(false);
    setJobStarted(true);
    firmwareUpgradeStart(3, filename, startAt, true);
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

  const getStaggeredSteps = React.useCallback(async () => {
    try {
      setStaggeredSteps(<p>Loading staggered steps...</p>);
      const resp = await postData(
        `${process.env.API_URL}/api/v1.0/firmware/upgradecheck`,
        token,
        { group: commitTarget.group },
      );
      const groups = resp.data.upgrade_groups;
      const stepElements = [];
      // enumerate groups and add step <index> to stepElements
      for (const [index, group] of groups.entries()) {
        stepElements.push(<h2 key={`stepheader${index}`}>Step {index + 1}</h2>);
        const devicesElements = [];
        for (const device of group) {
          devicesElements.push(<li key={device}>{device}</li>);
        }
        stepElements.push(<ul key={`steplist${index}`}>{devicesElements}</ul>);
      }
      setStaggeredSteps(stepElements);
      setStaggeredCompatible(true);
    } catch (error) {
      if (error.status === 400) {
        const errorMessage = await error.json();
        setStaggeredSteps(
          <p>Error fetching staggered steps: {errorMessage.message}</p>,
        );
      } else {
        setStaggeredSteps(
          <p>Error fetching staggered steps: {error.message}</p>,
        );
      }
    }
  }, [filename]);

  let error = "";
  let disableStartButton = true;
  let disableStaggeredButton = true;
  let step3abortDisabled = true;

  if (jobStatus === "EXCEPTION") {
    error = [<FirmwareError key="exception" devices={jobResult.devices} />];
  } else if (jobStatus === "RUNNING" || jobStatus === "SCHEDULED") {
    step3abortDisabled = false;
  }

  if (jobStarted === true) {
    disableStartButton = true;
  } else if (startAtError === true) {
    disableStartButton = true;
  } else if (activateStep3 === true) {
    disableStartButton = false;
    disableStaggeredButton = false;
  }

  if (commitTarget.group === undefined) {
    disableStaggeredButton = true;
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
            <Popup
              content="Only for groups of ACCESS only devices. Will reboot devices in steps to minimize impact."
              wide
              trigger={
                <div>
                  <button
                    id={"step3buttonStaggered"}
                    onClick={openStaggeredConfirm}
                    disabled={disableStaggeredButton}
                  >
                    Staggered reboots...
                  </button>
                </div>
              }
            />
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
        <Modal
          open={confirmStaggeredDiagOpen}
          onClose={closeStaggeredConfirm}
          size="small"
        >
          <ModalHeader>Staggered Reboots Steps</ModalHeader>
          <ModalContent>
            <p>
              Are you sure you want to (schedule) reboot devices in the
              following steps?
            </p>
            {staggeredSteps}
          </ModalContent>
          <ModalActions>
            <Button onClick={closeStaggeredConfirm}>Cancel</Button>
            <Button
              onClick={okStaggeredConfirm}
              disabled={!staggeredCompatible}
              color="blue"
            >
              OK
            </Button>
          </ModalActions>
        </Modal>
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

FirmwareStep3.propTypes = {
  firmwareUpgradeStart: PropTypes.func.isRequired,
  firmwareUpgradeAbort: PropTypes.func.isRequired,
  filename: PropTypes.string,
  jobData: PropTypes.object,
  jobStatus: PropTypes.string,
  jobId: PropTypes.string,
  jobFinishedDevices: PropTypes.array.isRequired,
  jobResult: PropTypes.object,
  activateStep3: PropTypes.bool.isRequired,
  totalCount: PropTypes.number.isRequired,
  logLines: PropTypes.array.isRequired,
  commitTarget: PropTypes.object.isRequired,
};

export default FirmwareStep3;
