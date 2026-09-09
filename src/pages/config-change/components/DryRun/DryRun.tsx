import { useState } from "react";
import { Form } from "semantic-ui-react";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import { Tooltip } from "../../../../components/Tooltip";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { Task } from "../../../../components/Task";
import permissionsCheck from "../../../../utils/permissions/permissionsCheck";
import { DryRunError } from "./DryRunError";
import { DryRunProgressBar } from "./DryRunProgressBar";
import { DryRunProgressInfo } from "./DryRunProgressInfo";
import type { DeviceSyncOptions } from "../../api/configChangeApi";
import type { Job } from "../../../../types/job";

type DryRunProps = {
  readonly devices: Record<string, unknown>;
  readonly dryRunSyncStart: (options: DeviceSyncOptions) => void;
  readonly dryRunProgressData: Job | null;
  readonly dryRunJobStatus: string;
  readonly jobId: number | string;
  readonly repoWorkingState: boolean;
  readonly synctoForce: boolean;
  readonly setSynctoForce: (force: boolean) => void;
  readonly dryRunDisable: boolean;
  readonly resetState: () => void;
  readonly totalCount: number;
  readonly logLines: string[];
};

export function DryRun({
  devices,
  dryRunSyncStart,
  dryRunProgressData,
  dryRunJobStatus,
  jobId,
  repoWorkingState,
  synctoForce,
  setSynctoForce,
  dryRunDisable,
  resetState,
  totalCount,
  logLines,
}: DryRunProps) {
  const [resync, setResync] = useState(false);

  return (
    <>
      <Task
        title={
          <>
            Dry run (2/4)
            <Tooltip
              title={
                "This step will generate new configurations and send them to the targeted devices, and the devices will then compare their currently running configuration to the newly generated and return a diff." +
                " No configuration will be changed. If any device has been configured outside of NMS you will get a configuration hash mismatch error, and need to do a force retry to see which local changes a commit would overwrite."
              }
            >
              <HelpOutlineOutlinedIcon fontSize="small" />
            </Tooltip>
          </>
        }
      >
        <p>
          Step 2 of 4: Sending generated configuration to devices to calculate
          diff and check sanity
        </p>
        <Form>
          <div className="info">
            <FormControlLabel
              control={
                <Checkbox
                  name="resync"
                  checked={resync}
                  onChange={(e) => setResync(e.target.checked)}
                />
              }
              label="Re-sync devices (check for local changes made outside of NMS)"
            />
          </div>
          <div className="info">
            <Button
              id="dryrunButton"
              variant="contained"
              color="secondary"
              hidden={!permissionsCheck("Config change", "write")}
              disabled={repoWorkingState === true || dryRunDisable}
              onClick={() => dryRunSyncStart({ resync })}
            >
              Dry run
            </Button>
            <Button
              id="resetButton"
              variant="contained"
              color="secondary"
              hidden={!permissionsCheck("Config change", "write")}
              disabled={dryRunJobStatus !== "FINISHED"}
              onClick={resetState}
            >
              Start over
            </Button>
          </div>
        </Form>
        <DryRunProgressBar
          dryRunJobStatus={dryRunJobStatus}
          dryRunProgressData={dryRunProgressData}
          totalDevices={totalCount}
        />
        <DryRunProgressInfo
          dryRunJobStatus={dryRunJobStatus}
          dryRunProgressData={dryRunProgressData}
          jobId={jobId}
          logLines={logLines}
        />
      </Task>
      {dryRunJobStatus === "EXCEPTION" && (
        <DryRunError
          dryRunSyncStart={dryRunSyncStart}
          devices={devices}
          resync={resync}
          synctoForce={synctoForce}
          setSynctoForce={setSynctoForce}
        />
      )}
    </>
  );
}
