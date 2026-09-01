import { Checkbox } from "semantic-ui-react";
import type { CheckboxProps } from "semantic-ui-react";
import Button from "@mui/material/Button";
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
        <Checkbox
          label="Force overwrite of local changes"
          name="force"
          checked={synctoForce}
          onChange={(_e: unknown, data: CheckboxProps) =>
            setSynctoForce(data.checked === true)
          }
        />
      </div>
    </div>
  );
}
