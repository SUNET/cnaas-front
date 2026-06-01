import { useCallback, useState, type ChangeEvent, type ReactNode } from "react";
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
import { FirmwareProgressBar } from "./FirmwareProgressBar";
import { FirmwareProgressInfo } from "./FirmwareProgressInfo";
import { FirmwareError } from "./FirmwareError";
import { fetchStaggeredSteps, getExceptionDevices } from "./firmwareUpgradeApi";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { useFirmwareUpgrade } from "./FirmwareUpgradeContext";

const dateRegEx = new RegExp(
  "^([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})?$",
);

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
      setStaggeredSteps(<p>Loading staggered steps...</p>);
      const groups = await fetchStaggeredSteps(commitTarget.group ?? "", token);
      const stepElements: ReactNode[] = [];
      // enumerate groups and add step <index> to stepElements
      for (const [index, group] of groups.entries()) {
        stepElements.push(<h2 key={`stepheader${index}`}>Step {index + 1}</h2>);
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
          <p>Error fetching staggered steps: {errorMessage.message}</p>,
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        setStaggeredSteps(<p>Error fetching staggered steps: {message}</p>);
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
        <button className="close">Close</button>
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
