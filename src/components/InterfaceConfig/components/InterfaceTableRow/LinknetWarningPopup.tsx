import { Popup, Button } from "semantic-ui-react";
import type { LinknetMismatch } from "../../stores/interfaceConfigReducer";

interface LinknetWarningPopupProps {
  readonly mismatch: LinknetMismatch;
}

export function LinknetWarningPopup({ mismatch }: LinknetWarningPopupProps) {
  const isLinknet = mismatch.linknetId !== 0;

  const content = (
    <div>
      {isLinknet && (
        <p>
          <strong>Linknet ID:</strong> {mismatch.linknetId}
          <br />
          <strong>Network:</strong> {mismatch.ipv4Network}
        </p>
      )}
      <p>
        <strong>Expected neighbor:</strong> {mismatch.expectedHostname}
        {isLinknet && <> : {mismatch.expectedPort}</>}
      </p>
      <p>
        <strong>LLDP actual:</strong>{" "}
        {mismatch.actualHostname
          ? `${mismatch.actualHostname}${mismatch.actualPort ? ` : ${mismatch.actualPort}` : ""}`
          : "No LLDP neighbor detected"}
      </p>
    </div>
  );

  return (
    <Popup
      header={isLinknet ? "Linknet mismatch" : "Neighbor mismatch"}
      content={content}
      position="right center"
      wide
      hoverable
      trigger={
        <Button className="table-button-compact" color="yellow">
          !
        </Button>
      }
    />
  );
}
