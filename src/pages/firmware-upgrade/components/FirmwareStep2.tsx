import { useEffect, useState } from "react";
import {
  Form,
  Confirm,
  Select,
  type DropdownProps,
  type DropdownItemProps,
} from "semantic-ui-react";
import { FirmwareProgressBar } from "./FirmwareProgressBar";
import { FirmwareProgressInfo } from "./FirmwareProgressInfo";
import {
  fetchFirmwareFiles,
  getExceptionDevices,
} from "../api/firmwareUpgradeApi";
import { FirmwareError } from "./FirmwareError";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";

export function FirmwareStep2() {
  const { token } = useAuthToken();
  const {
    step2: { jobId, jobData, totalCount },
    logLines,
    targetArch,
    skipStep2,
    firmwareUpgradeStart,
    firmwareUpgradeAbort,
  } = useFirmwareUpgrade();

  const [filename, setFilename] = useState<string | null>(null);
  const [firmwareOptions, setFirmwareOptions] = useState<DropdownItemProps[]>(
    [],
  );
  const [firmwareLocked, setFirmwareLocked] = useState(false);
  const [firmwareSelected, setFirmwareSelected] = useState(false);
  const [confirmDiagOpen, setConfirmDiagOpen] = useState(false);

  const jobStatus = jobData?.status ?? null;
  const jobResult = jobData?.result ?? null;
  const jobFinishedDevices = jobData?.finished_devices ?? null;

  const okConfirm = () => {
    setConfirmDiagOpen(false);
    setFirmwareLocked(true);
    skipStep2();
  };

  const updateFilename = (
    _e: React.SyntheticEvent<HTMLElement>,
    option: DropdownProps,
  ) => {
    if (firmwareLocked === false) {
      setFilename(String(option.value));
    }
    setFirmwareSelected(true);
  };

  const onClickStep2 = () => {
    setFirmwareLocked(true);
    firmwareUpgradeStart(2, filename, null);
    const confirmButtonElem = document.getElementById("step2button");
    if (confirmButtonElem instanceof HTMLButtonElement) {
      confirmButtonElem.disabled = true;
    }
  };

  const onClickStep2Abort = () => {
    firmwareUpgradeAbort(2);
    const confirmButtonElem = document.getElementById("step2abortButton");
    if (confirmButtonElem instanceof HTMLButtonElement) {
      confirmButtonElem.disabled = true;
    }
  };

  /**
   * Fetches the firmware files from the API and returns them as an array of DropdownItemProps.
   *
   * EOS firmware files are assumed to be named according to architectures:
   *   - "EOS-": 32-bit
   *   - "EOS64-": 64-bit
   *   - "EOSarm-": ARM
   *
   * @returns {Promise<DropdownItemProps[]>} An array of DropdownItemProps representing the firmware files.
   */
  const getFirmwareFiles = async (): Promise<DropdownItemProps[]> => {
    const fetchedFileNames = await fetchFirmwareFiles(token);
    const newFirmwareOptions: DropdownItemProps[] = [];
    fetchedFileNames.forEach((fetchedFileName, index) => {
      if (process.env.ARISTA_DETECT_ARCH === "true") {
        const [prefix, version] = fetchedFileName.split(/-(.*)/);
        const has32version = fetchedFileNames.includes(`EOS-${version}`);
        const has64version = fetchedFileNames.includes(`EOS64-${version}`);

        // Hide firmware that doesn't match the target device's architecture.
        // EOSarm images are arm-only; EOS/EOS64 are x86-only. Non-EOS files and
        // unknown targets (targetArch === null, e.g. group upgrades) are shown.
        const isArmImage = prefix === "EOSarm";
        const isX86Image = prefix === "EOS" || prefix === "EOS64";
        if (targetArch === "arm" && isX86Image) return;
        if (targetArch === "x86" && isArmImage) return;

        switch (prefix) {
          case "EOSarm":
            newFirmwareOptions.push({
              key: index,
              value: fetchedFileName,
              text: `${fetchedFileName.substring(7)} (arm)`,
              icon: "circle",
            });
            break;

          case "EOS64":
            if (has32version) {
              // build combined entry for both 32+64bit images if both are found
              newFirmwareOptions.push({
                key: index,
                value: `detect_arch-${fetchedFileName}`,
                text: `${fetchedFileName.substring(6)} (32+64bit)`,
                icon: "circle",
              });
            } else {
              newFirmwareOptions.push({
                key: index,
                value: fetchedFileName,
                text: `${fetchedFileName} (not dual-arch)`,
                icon: "adjust",
              });
            }
            break;

          case "EOS":
            if (has64version) {
              // combined entry for both 32+64bit images already added, skip this 32bit image
              break;
            }
            newFirmwareOptions.push({
              key: index,
              value: fetchedFileName,
              text: `${fetchedFileName} (not dual-arch)`,
              icon: "adjust",
              disabled: true,
            });
            break;

          default:
            newFirmwareOptions.push({
              key: index,
              value: fetchedFileName,
              text: fetchedFileName,
            });
            break;
        }
      } else {
        // Not Arista
        newFirmwareOptions.push({
          key: index,
          value: fetchedFileName,
          text: fetchedFileName,
        });
      }
    });

    return newFirmwareOptions;
  };

  useEffect(() => {
    const fetchData = async () => {
      const newFirmwareOptions = await getFirmwareFiles();
      setFirmwareOptions(newFirmwareOptions);
    };
    fetchData();
    // Re-fetch/re-filter when the target architecture resolves.
  }, [targetArch, token]);

  const error =
    jobStatus === "EXCEPTION" ? (
      <FirmwareError key="exception" devices={getExceptionDevices(jobResult)} />
    ) : null;
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
            onChange={updateFilename}
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
