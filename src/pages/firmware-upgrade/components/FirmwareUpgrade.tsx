import { Input } from "semantic-ui-react";
import { NavigationBlocker } from "../../../components/NavigationBlocker";
import { FirmwareStep1 } from "./FirmwareStep1";
import { FirmwareStep2 } from "./FirmwareStep2";
import { FirmwareStep3 } from "./FirmwareStep3";
import { useFirmwareUpgrade } from "../stores/FirmwareUpgradeContext";

const NAVIGATION_BLOCKER_MESSAGE =
  "A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave.";

export function FirmwareUpgrade() {
  const {
    blockNavigation,
    startError,
    commitTargetName,
    updateComment,
    updateTicketRef,
  } = useFirmwareUpgrade();

  return (
    <>
      <NavigationBlocker
        when={blockNavigation}
        message={NAVIGATION_BLOCKER_MESSAGE}
      />
      <section>
        <h1>Firmware upgrade</h1>
        <p>Firmware upgrade target {commitTargetName}</p>
        {startError && <p className="error">{startError}</p>}
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
