import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { DryRunFailList } from "./DryRunFailList";
import type { DeviceSyncOptions } from "../../api/configChangeApi";

type DryRunErrorProps = {
  readonly devices: Record<string, unknown>;
  readonly dryRunSyncStart: (options: DeviceSyncOptions) => void;
  readonly resync: boolean;
  readonly synctoForce: boolean;
  readonly setSynctoForce: (force: boolean) => void;
};

export function DryRunError({
  devices,
  dryRunSyncStart,
  resync,
  synctoForce,
  setSynctoForce,
}: DryRunErrorProps) {
  return (
    <div>
      <DryRunFailList devices={devices} />
      <div>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => dryRunSyncStart({ resync })}
        >
          Retry
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              name="force"
              checked={synctoForce}
              onChange={(e) => setSynctoForce(e.target.checked)}
            />
          }
          label="Force overwrite of local changes"
        />
      </div>
    </div>
  );
}
