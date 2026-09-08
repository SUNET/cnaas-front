import { Input } from "semantic-ui-react";
import Alert from "@mui/material/Alert";
import { NavigationBlocker } from "../../../components/NavigationBlocker";
import { FirmwareStep1 } from "./FirmwareStep1";
import { FirmwareStep2 } from "./FirmwareStep2";
import { FirmwareStep3 } from "./FirmwareStep3";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";
import type { TargetDeviceUpgradeInfo } from "../stores/firmwareUpgradeReducer";

const NAVIGATION_BLOCKER_MESSAGE =
  "A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave.";

function renderHostnameLink({ hostname }: TargetDeviceUpgradeInfo) {
  return (
    <a key={hostname} href={`/devices?filter[hostname]=${hostname}`}>
      {hostname}
    </a>
  );
}

function joinLinks(devices: readonly TargetDeviceUpgradeInfo[]) {
  return devices.map((device, i) => (
    <span key={device.hostname}>
      {i > 0 && ", "}
      {renderHostnameLink(device)}
    </span>
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
        <h1>Firmware upgrade</h1>
        <p>
          Firmware upgrade target:{" "}
          {group || targetDevices?.map((h) => h.hostname).join(", ") || "N/A"}
        </p>
        {startError && <p className="error">{startError}</p>}
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
        <p>Describe the change:</p>
        <Input
          placeholder="comment"
          maxLength={255}
          className="job_comment"
          onChange={updateComment}
        />
        <p>Enter service ticket ID reference:</p>
        <Input
          placeholder="ticket reference"
          maxLength={32}
          className="job_ticket_ref"
          onChange={updateTicketRef}
        />
        <FirmwareStep1 />
        <FirmwareStep2 />
        <FirmwareStep3 />
      </section>
    </>
  );
}
