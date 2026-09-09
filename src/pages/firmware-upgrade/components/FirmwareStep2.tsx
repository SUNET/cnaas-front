import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AdjustIcon from "@mui/icons-material/Adjust";
import CircleIcon from "@mui/icons-material/Circle";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { FirmwareProgressBar } from "./FirmwareProgressBar";
import { FirmwareProgressInfo } from "./FirmwareProgressInfo";
import {
  fetchFirmwareFiles,
  getExceptionDevices,
} from "../api/firmwareUpgradeApi";
import { FirmwareError } from "./FirmwareError";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";
import { Task } from "../../../components/Task";

/** A single selectable entry in the firmware dropdown. */
type FirmwareOption = {
  readonly key: number;
  readonly value: string;
  readonly text: string;
  readonly icon?: "circle" | "adjust";
  readonly disabled?: boolean;
};

export function FirmwareStep2() {
  const { token } = useAuthToken();
  const {
    step2: { jobId, jobData, totalCount },
    logLines,
    targetArch,
    targetDeviceArches,
    devicesMissingArch,
    skipStep2,
    firmwareUpgradeStart,
    firmwareUpgradeAbort,
  } = useFirmwareUpgrade();

  const [filename, setFilename] = useState<string | null>(null);
  const [firmwareOptions, setFirmwareOptions] = useState<FirmwareOption[]>([]);
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

  const updateFilename = (event: SelectChangeEvent) => {
    if (firmwareLocked === false) {
      setFilename(event.target.value);
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
   * Fetches the firmware files from the API and returns them as an array of FirmwareOption.
   *
   * EOS firmware files are assumed to be named according to architectures:
   *   - "EOS-": 32-bit
   *   - "EOS64-": 64-bit
   *   - "EOSarm-": ARM
   *
   * @returns {Promise<FirmwareOption[]>} An array of FirmwareOption representing the firmware files.
   */
  const getFirmwareFiles = async (): Promise<FirmwareOption[]> => {
    const fetchedFileNames = await fetchFirmwareFiles(token);
    const newFirmwareOptions: FirmwareOption[] = [];
    const requires32bit = targetDeviceArches.includes("X86_32");
    const requires64bit = targetDeviceArches.includes("X86_64");
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
                value: fetchedFileName,
                text: `${fetchedFileName.substring(6)} (32+64bit)`,
                icon: "circle",
              });
            } else if (requires32bit) {
              // Target devices include 32-bit-only hardware, but the matching
              // EOS-<version> file hasn't been downloaded, so those devices
              // would fail to download this firmware.
              newFirmwareOptions.push({
                key: index,
                value: fetchedFileName,
                text: `${fetchedFileName} (not dual-arch, missing 32-bit image)`,
                icon: "adjust",
                disabled: true,
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
            if (requires64bit) {
              // Target devices include 64-bit-capable hardware, but the
              // matching EOS64-<version> file hasn't been downloaded, so
              // those devices would fail to download this firmware.
              newFirmwareOptions.push({
                key: index,
                value: fetchedFileName,
                text: `${fetchedFileName} (not dual-arch, missing 64-bit image)`,
                icon: "adjust",
                disabled: true,
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
  }, [targetArch, targetDeviceArches, token]);

  const error =
    jobStatus === "EXCEPTION" ? (
      <FirmwareError key="exception" devices={getExceptionDevices(jobResult)} />
    ) : null;
  const step2abortDisabled = !(
    jobStatus === "RUNNING" || jobStatus === "SCHEDULED"
  );
  const step2disabled =
    !firmwareSelected || firmwareLocked || devicesMissingArch.length > 0;

  return (
    <Task title="Activate firmware (2/3)">
      <Typography>
        Step 2 of 3: Download firmware to device and activate it for next reboot
      </Typography>
      <Box component="form">
        <Select
          value={filename ?? ""}
          onChange={updateFilename}
          disabled={firmwareLocked}
          displayEmpty
          renderValue={(selected) =>
            firmwareOptions.find((option) => option.value === selected)?.text ||
            selected ||
            "filename"
          }
          inputProps={{ "aria-label": "firmware file" }}
        >
          {firmwareOptions.map((option) => (
            <MenuItem
              key={option.key}
              value={option.value}
              disabled={option.disabled}
            >
              {option.icon === "circle" && (
                <CircleIcon fontSize="small" sx={{ marginRight: 1 }} />
              )}
              {option.icon === "adjust" && (
                <AdjustIcon fontSize="small" sx={{ marginRight: 1 }} />
              )}
              {option.text}
            </MenuItem>
          ))}
        </Select>
        <Stack direction="row" spacing={2} sx={{ alignItems: "baseline" }}>
          <Button
            id="step2button"
            variant="contained"
            disabled={step2disabled}
            onClick={() => onClickStep2()}
          >
            Start activate firmware
          </Button>
          <Button
            id="step2skipButton"
            variant="contained"
            disabled={step2disabled}
            onClick={() => setConfirmDiagOpen(true)}
          >
            Skip to step 3
          </Button>
          <Button
            id="step2abortButton"
            variant="contained"
            color="error"
            disabled={step2abortDisabled}
            onClick={() => onClickStep2Abort()}
          >
            Abort!
          </Button>
        </Stack>
      </Box>
      <ConfirmDialog
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
      {error}
    </Task>
  );
}
