import { Fragment } from "react";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { NavigationBlocker } from "../../../components/NavigationBlocker";
import { FirmwareStep1 } from "./FirmwareStep1";
import { FirmwareStep2 } from "./FirmwareStep2";
import { FirmwareStep3 } from "./FirmwareStep3";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";
import type { TargetDeviceUpgradeInfo } from "../stores/firmwareUpgradeReducer";

const NAVIGATION_BLOCKER_MESSAGE =
  "A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave.";

function renderHostnameLink({ hostname }: TargetDeviceUpgradeInfo) {
  return <Link href={`/devices?filter[hostname]=${hostname}`}>{hostname}</Link>;
}

function joinLinks(devices: readonly TargetDeviceUpgradeInfo[]) {
  return devices.map((device, i) => (
    <Fragment key={device.hostname}>
      {i > 0 && ", "}
      {renderHostnameLink(device)}
    </Fragment>
  ));
}

export function FirmwareUpgrade() {
  const {
    blockNavigation,
    startError,
    targetDevices,
    devicesMissingArch,
    devicesMissingPlatform,
    updateComment,
    updateTicketRef,
    group,
  } = useFirmwareUpgrade();

  return (
    <>
      <NavigationBlocker
        when={blockNavigation}
        message={NAVIGATION_BLOCKER_MESSAGE}
      />
      <section>
        <Typography variant="h4" component="h1">
          Firmware upgrade
        </Typography>
        <Typography>
          Firmware upgrade target:{" "}
          {group || targetDevices?.map((h) => h.hostname).join(", ") || "N/A"}
        </Typography>
        {startError && (
          <Alert severity="error" sx={{ marginBottom: "var(--size-md)" }}>
            {startError}
          </Alert>
        )}
        {devicesMissingArch.length > 0 && (
          <Alert severity="error" sx={{ marginBottom: "var(--size-md)" }}>
            CPU architecture is unknown for these devices:{" "}
            {joinLinks(devicesMissingArch)}. Run &quot;Update facts&quot; on
            them before proceeding.
          </Alert>
        )}
        {devicesMissingPlatform.length > 0 && (
          <Alert severity="warning" sx={{ marginBottom: "var(--size-md)" }}>
            Platform is unknown for these devices:{" "}
            {joinLinks(devicesMissingPlatform)}. Run &quot;Update facts&quot; on
            them to get more accurate firmware compatibility checks.
          </Alert>
        )}
        <Typography>Describe the change:</Typography>
        <TextField
          placeholder="comment"
          onChange={updateComment}
          sx={{ width: "50em", marginBottom: "var(--size-md)" }}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
        <Typography>Enter service ticket ID reference:</Typography>
        <TextField
          placeholder="ticket reference"
          onChange={updateTicketRef}
          sx={{ width: "15em", marginBottom: "var(--size-md)" }}
          slotProps={{ htmlInput: { maxLength: 32 } }}
        />
        <FirmwareStep1 />
        <FirmwareStep2 />
        <FirmwareStep3 />
      </section>
    </>
  );
}
