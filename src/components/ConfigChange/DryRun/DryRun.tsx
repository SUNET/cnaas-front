import { useState } from "react";
import { Checkbox, Form, Icon, Popup } from "semantic-ui-react";
import permissionsCheck from "../../../utils/permissions/permissionsCheck";
import DryRunError from "./DryRunError";
import { DryRunProgressBar } from "./DryRunProgressBar";
import { DryRunProgressInfo } from "./DryRunProgressInfo";
import type { DeviceSyncOptions } from "../../../services/configChangeApi";
import type { DryRunProgress } from "../../../store/configChange/configChangeReducer";

interface DryRunProps {
  readonly devices: Record<string, unknown>;
  readonly dryRunSyncStart: (options: DeviceSyncOptions) => void;
  readonly dryRunProgressData: DryRunProgress;
  readonly dryRunJobStatus: string;
  readonly jobId: number | string;
  readonly repoWorkingState: boolean;
  readonly synctoForce: boolean;
  readonly setSynctoForce: (force: boolean) => void;
  readonly dryRunDisable: boolean;
  readonly resetState: () => void;
  readonly totalCount: number;
  readonly logLines: string[];
}

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
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="task-container">
      <div className="heading">
        <h2 id="dry_run_section">
          <Icon
            name="dropdown"
            onClick={() => setExpanded((prev) => !prev)}
            rotated={expanded ? undefined : "counterclockwise"}
          />
          Dry run (2/4)
          <Popup
            content={
              "This step will generate new configurations and send them to the targeted devices, and the devices will then compare their currently running configuration to the newly generated and return a diff." +
              " No configuration will be changed. If any device has been configured outside of NMS you will get a configuration hash mismatch error, and need to do a force retry to see which local changes a commit would overwrite."
            }
            trigger={<Icon name="question circle outline" size="small" />}
            wide="very"
          />
        </h2>
      </div>
      <div className="task-collapsable" hidden={!expanded}>
        <p>
          Step 2 of 4: Sending generated configuration to devices to calculate
          diff and check sanity
        </p>
        <Form>
          <div className="info">
            <Checkbox
              label="Re-sync devices (check for local changes made outside of NMS)"
              name="resync"
              checked={resync}
              onChange={(_e, data) => setResync(data.checked as boolean)}
            />
          </div>
          <div className="info">
            <button
              id="dryrunButton"
              hidden={!permissionsCheck("Config change", "write")}
              disabled={repoWorkingState === true || dryRunDisable}
              onClick={() => dryRunSyncStart({ resync })}
            >
              Dry run
            </button>
            <button
              id="resetButton"
              hidden={!permissionsCheck("Config change", "write")}
              disabled={dryRunJobStatus !== "FINISHED"}
              onClick={resetState}
            >
              Start over
            </button>
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
      </div>
      {dryRunJobStatus === "EXCEPTION" && (
        <DryRunError
          dryRunSyncStart={dryRunSyncStart}
          devices={devices}
          resync={resync}
          synctoForce={synctoForce}
          setSynctoForce={setSynctoForce}
        />
      )}
    </div>
  );
}
