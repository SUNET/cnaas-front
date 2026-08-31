import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";

export function LinknetOkButton() {
  return (
    <Tooltip
      title={
        <>
          <h4>Linknet OK</h4>
          LLDP neighbor data matches expected linknet neighbor.
        </>
      }
      placement="right"
    >
      <span>
        <Button size="small" sx={{ color: "success.main", minWidth: 0 }}>
          L
        </Button>
      </span>
    </Tooltip>
  );
}
