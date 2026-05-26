import { Popup, Button } from "semantic-ui-react";

export function LinknetOkButton() {
  return (
    <Popup
      header="Linknet OK"
      content="LLDP neighbor data matches expected linknet neighbor."
      position="right center"
      hoverable
      trigger={
        <Button className="table-button-compact" color="green">
          L
        </Button>
      }
    />
  );
}
