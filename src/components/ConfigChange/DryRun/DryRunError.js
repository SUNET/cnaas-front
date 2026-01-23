import { DryRunFailList } from "./DryRunFailList";
import { Checkbox } from "semantic-ui-react";
import PropTypes from "prop-types";

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

DryRunError.propTypes = {
  devices: PropTypes.object.isRequired,
  dryRunSyncStart: PropTypes.func.isRequired,
  resync: PropTypes.bool.isRequired,
  synctoForce: PropTypes.bool.isRequired,
  setSynctoForce: PropTypes.func.isRequired,
};

export default DryRunError;
