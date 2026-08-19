import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import queryString from "query-string";
import { Form, Confirm, Select } from "semantic-ui-react";
import { FirmwareProgressBar } from "./FirmwareProgressBar";
import { FirmwareProgressInfo } from "./FirmwareProgressInfo";
import { getData } from "../../utils/getData";
import { FirmwareError } from "./FirmwareError";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import PropTypes from "prop-types";

/**
 * Map a device model string to its firmware architecture. The 710XP family runs
 * ARM (EOSarm-) images across all SKU variants; everything else (and unknown or
 * missing models) is treated as x86 (EOS/EOS64-).
 */
function archForModel(model) {
  if (typeof model === "string" && model.includes("710XP")) {
    return "arm";
  }
  return "x86";
}

FirmwareStep2.propTypes = {
  skipStep2: PropTypes.func,
  firmwareUpgradeStart: PropTypes.func,
  firmwareUpgradeAbort: PropTypes.func,
  jobData: PropTypes.object,
  jobId: PropTypes.number,
  totalCount: PropTypes.number,
  logLines: PropTypes.arrayOf(PropTypes.string),
};

export function FirmwareStep2({
  skipStep2,
  firmwareUpgradeStart,
  firmwareUpgradeAbort,
  jobData,
  jobId,
  totalCount,
  logLines,
}) {
  const { token } = useAuthToken();
  const { search } = useLocation();

  const [filename, setFilename] = useState(null);
  const [firmwareOptions, setFirmwareOptions] = useState([]);
  const [firmwareLocked, setFirmwareLocked] = useState(false);
  const [firmwareSelected, setFirmwareSelected] = useState(false);
  const [confirmDiagOpen, setConfirmDiagOpen] = useState(false);
  // Architecture of a single-device target, used to filter firmware options.
  // `null` for group targets or before it resolves — those stay unfiltered.
  const [targetArch, setTargetArch] = useState(null);

  const jobStatus = jobData?.status ?? null;
  const jobResult = jobData?.result ?? null;
  const jobFinishedDevices = jobData?.finished_devices ?? null;

  const okConfirm = () => {
    setConfirmDiagOpen(false);
    setFirmwareLocked(true);
    skipStep2();
  };

  const updateFilename = (e, option) => {
    if (firmwareLocked === false) {
      const val = option.value;
      setFilename(val);
    }
    setFirmwareSelected(true);
  };

  const onClickStep2 = () => {
    setFirmwareLocked(true);
    firmwareUpgradeStart(2, filename, null);
    const confirmButtonElem = document.getElementById("step2button");
    confirmButtonElem.disabled = true;
  };

  const onClickStep2Abort = () => {
    firmwareUpgradeAbort(2);
    const confirmButtonElem = document.getElementById("step2abortButton");
    confirmButtonElem.disabled = true;
  };

  const getFirmwareFiles = async () => {
    const url = `${process.env.API_URL}/api/v1.0/firmware`;
    const data = await getData(url, token);
    const dataFiles = data.data.files;
    const newFirmwareOptions = [];
    dataFiles.forEach((filename, index) => {
      if (
        process.env.ARISTA_DETECT_ARCH !== undefined &&
        process.env.ARISTA_DETECT_ARCH === "true"
      ) {
        // Hide firmware that doesn't match the target device's architecture.
        // EOSarm images are arm-only; EOS/EOS64 are x86-only. Non-EOS files and
        // unknown targets (targetArch === null, e.g. group upgrades) are shown.
        const isArmImage = filename.startsWith("EOSarm-");
        const isX86Image =
          filename.startsWith("EOS-") || filename.startsWith("EOS64-");
        if (targetArch === "arm" && isX86Image) return;
        if (targetArch === "x86" && isArmImage) return;

        if (filename.startsWith("EOSarm-")) {
          newFirmwareOptions.push({
            key: index,
            value: filename,
            text: `${filename.substring(7)} (arm)`,
            icon: "circle",
          });
        } else if (
          filename.startsWith("EOS64-") &&
          dataFiles.includes(`EOS${filename.substring(5)}`)
        ) {
          // build combined entry for both 32+64bit images if both are found
          newFirmwareOptions.push({
            key: index,
            value: `detect_arch-${filename}`,
            text: `${filename.substring(6)} (32+64bit)`,
            icon: "circle",
          });
        } else if (
          filename.startsWith("EOS-") &&
          dataFiles.includes(`EOS64${filename.substring(3)}`)
        ) {
          // corresponding 64bit image found, don't show 32bit image
        } else if (filename.startsWith("EOS")) {
          newFirmwareOptions.push({
            key: index,
            value: filename,
            text: `${filename} (not dual-arch)`,
            icon: "adjust",
            disabled: true,
          });
        } else {
          newFirmwareOptions.push({
            key: index,
            value: filename,
            text: filename,
            icon: "circle",
          });
        }
      } else {
        newFirmwareOptions.push({
          key: index,
          value: filename,
          text: filename,
        });
      }
    });
    return newFirmwareOptions;
  };

  useEffect(() => {
    const hostname = queryString.parse(search).hostname;
    if (!hostname) {
      return;
    }
    const fetchArch = async () => {
      try {
        const url = `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=${hostname}`;
        const data = await getData(url, token);
        const model = data?.data?.devices?.[0]?.model;
        setTargetArch(archForModel(model));
      } catch (error) {
        console.error("Failed to determine device architecture:", error);
        setTargetArch(archForModel(null));
      }
    };
    fetchArch();
  }, [search, token]);

  useEffect(() => {
    const fetchData = async () => {
      const newFirmwareOptions = await getFirmwareFiles();
      setFirmwareOptions(newFirmwareOptions);
    };
    fetchData();
  }, [targetArch]);

  const error =
    jobStatus === "EXCEPTION"
      ? [<FirmwareError key="exception" devices={jobResult.devices} />]
      : "";
  const step2abortDisabled = !(
    jobStatus === "RUNNING" || jobStatus === "SCHEDULED"
  );
  const step2disabled = !firmwareSelected || firmwareLocked;

  return (
    <div className="task-container">
      <div className="heading">
        <h2>Activate firmware (2/3)</h2>
        <button className="close">Close</button>
      </div>
      <div className="task-collapsable">
        <p>
          Step 2 of 3: Download firmware to device and activate it for next
          reboot
        </p>
        <Form>
          <Select
            placeholder="filename"
            options={firmwareOptions}
            onChange={(e, option) => updateFilename(e, option)}
            disabled={firmwareLocked}
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
              onClick={() => setConfirmDiagOpen(true)}
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
          onCancel={() => setConfirmDiagOpen(false)}
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
