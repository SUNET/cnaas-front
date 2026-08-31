import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import type { LinknetMismatch } from "../../types/linknet";

type LinknetWarningPopupProps = {
  readonly mismatch: LinknetMismatch;
};

export function LinknetWarningPopup({ mismatch }: LinknetWarningPopupProps) {
  const isLinknet = mismatch.linknetId !== 0;

  const content = (
    <div>
      <h4>{isLinknet ? "Linknet mismatch" : "Neighbor mismatch"}</h4>
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
    <Tooltip
      title={content}
      placement="right"
      slotProps={{ tooltip: { sx: { maxWidth: "none" } } }}
    >
      <span>
        <Button size="small" sx={{ color: "warning.main", minWidth: 0 }}>
          !
        </Button>
      </span>
    </Tooltip>
  );
}
