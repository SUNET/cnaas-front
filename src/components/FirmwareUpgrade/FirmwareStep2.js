import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Form, Confirm, Select } from "semantic-ui-react";
import FirmwareProgressBar from "./FirmwareProgressBar";
import FirmwareProgressInfo from "./FirmwareProgressInfo";
import { getData } from "../../utils/getData";
import FirmwareError from "./FirmwareError";

function FirmwareStep2({
  firmwareUpgradeStart,
  firmwareUpgradeAbort,
  jobStatus,
  jobId,
  jobResult,
  jobFinishedDevices,
  jobData,
  totalCount,
  logLines,
  skipStep2,
}) {
  const [filename, setFilename] = useState(null);
  const [firmware_options, setFirmwareOptions] = useState([]);
  const [firmware_locked, setFirmwareLocked] = useState(false);
  const [firmware_selected, setFirmwareSelected] = useState(false);
  const [confirmDiagOpen, setConfirmDiagOpen] = useState(false);

  const openConfirm = useCallback(() => {
    setConfirmDiagOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDiagOpen(false);
  }, []);

  const okConfirm = useCallback(() => {
    setConfirmDiagOpen(false);
    setFirmwareLocked(true);
    skipStep2();
  }, [skipStep2]);

  const updateFilename = useCallback(
    (e, option) => {
      if (!firmware_locked) {
        const val = option.value;
        setFilename(val);
      }
      setFirmwareSelected(true);
    },
    [firmware_locked],
  );

  const onClickStep2 = useCallback(() => {
    setFirmwareLocked(true);
    firmwareUpgradeStart(2, filename, null);
    const confirmButtonElem = document.getElementById("step2button");
    confirmButtonElem.disabled = true;
  }, [firmwareUpgradeStart, filename]);

  const onClickStep2Abort = useCallback(() => {
    firmwareUpgradeAbort(2);
    const confirmButtonElem = document.getElementById("step2abortButton");
    confirmButtonElem.disabled = true;
  }, [firmwareUpgradeAbort]);

  const getFirmwareFiles = useCallback(() => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware`;
    getData(url, credentials).then((data) => {
      console.log("this should be data", data);
      {
        const firmware_options = [];
        data.data.files.forEach((filename, index) => {
          if (
            process.env.ARISTA_DETECT_ARCH !== undefined &&
            process.env.ARISTA_DETECT_ARCH === "true"
          ) {
            // build combined entry for both 32+64bit images if both are found
            if (
              filename.startsWith("EOS64-") &&
              data.data.files.includes(`EOS${filename.substring(5)}`)
            ) {
              firmware_options.push({
                key: index,
                value: `detect_arch-${filename}`,
                text: `${filename.substring(6)} (32+64bit)`,
                icon: "circle",
              });
            } else if (
              filename.startsWith("EOS-") &&
              data.data.files.includes(`EOS64${filename.substring(3)}`)
            ) {
              // corresponding 64bit image found, don't show 32bit image
            } else if (filename.startsWith("EOS")) {
              firmware_options.push({
                key: index,
                value: filename,
                text: `${filename} (not dual-arch)`,
                icon: "adjust",
                disabled: true,
              });
            } else {
              firmware_options.push({
                key: index,
                value: filename,
                text: filename,
                icon: "circle",
              });
            }
          } else {
            firmware_options.push({
              key: index,
              value: filename,
              text: filename,
            });
          }
        });
        setFirmwareOptions(firmware_options);
        console.log("this is new state", firmware_options);
      }
    });
  }, []);

  useEffect(() => {
    getFirmwareFiles();
  }, [getFirmwareFiles]);

  let error = "";
  let step2abortDisabled = true;
  let step2disabled = true;

  if (jobStatus === "EXCEPTION") {
    // console.log("jobStatus errored");
    error = [<FirmwareError key="exception" devices={jobResult.devices} />];
  } else if (jobStatus === "RUNNING" || jobStatus === "SCHEDULED") {
    step2abortDisabled = false;
  }

  if (firmware_selected === false) {
    step2disabled = true;
  } else if (firmware_locked === true) {
    step2disabled = true;
  } else {
    step2disabled = false;
  }

  return (
    <div className="task-container">
      <div className="heading">
        <h2>Activate firmware (2/3)</h2>
        <a href="#">
          <button className="close">Close</button>
        </a>
      </div>
      <div className="task-collapsable">
        <p>
          Step 2 of 3: Download firmware to device and activate it for next
          reboot
        </p>
        <Form>
          <Select
            placeholder="filename"
            options={firmware_options}
            onChange={updateFilename}
            disabled={firmware_locked}
          />
          <div className="info">
            <button
              id="step2button"
              disabled={step2disabled}
              onClick={() => onClickStep2()}
            >
              Start activate firmware
            </button>
            <button
              id="step2skipButton"
              disabled={step2disabled}
              onClick={(e) => openConfirm(e)}
            >
              Skip to step 3
            </button>
            <button
              id="step2abortButton"
              disabled={step2abortDisabled}
              onClick={() => onClickStep2Abort()}
            >
              Abort!
            </button>
          </div>
        </Form>
        <Confirm
          content="Are you sure all selected devices already have the target firmware downloaded and activated?"
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

FirmwareStep2.propTypes = {
  firmwareUpgradeStart: PropTypes.func.isRequired,
  firmwareUpgradeAbort: PropTypes.func.isRequired,
  jobStatus: PropTypes.string,
  jobId: PropTypes.number,
  jobResult: PropTypes.object,
  jobFinishedDevices: PropTypes.array.isRequired,
  jobData: PropTypes.object,
  totalCount: PropTypes.number.isRequired,
  logLines: PropTypes.array.isRequired,
  skipStep2: PropTypes.func.isRequired,
};

export default FirmwareStep2;
