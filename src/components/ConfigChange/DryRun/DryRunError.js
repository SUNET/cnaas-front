import DryRunFailList from "./DryRunFailList";
import { Checkbox } from "semantic-ui-react";

function DryRunError({
  devices,
  dryRunSyncStart,
  resync,
  synctoForce,
  setSynctoForce,
}) {
  return (
    <div>
      <DryRunFailList devices={devices} />
      <div>
        <button onClick={() => dryRunSyncStart({ resync })}>Retry</button>
        <Checkbox
          label="Force overwrite of local changes"
          name="force"
          checked={synctoForce}
          onChange={(e, data) => setSynctoForce(data.checked)}
        />
      </div>
    </div>
  );
}

export default DryRunError;
