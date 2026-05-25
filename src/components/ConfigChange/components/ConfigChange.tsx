import { SemanticToastContainer } from "react-semantic-toasts-2";
import { NavigationBlocker } from "../../NavigationBlocker";
import { useConfigChange } from "../stores/ConfigChangeContext";
import { ConfigChangeStep1 } from "./ConfigChangeStep1";
import { ConfigChangeStep4 } from "./ConfigChangeStep4";
import { DryRun } from "./DryRun/DryRun";
import { SyncStatus } from "./SyncStatus";
import { VerifyDiff } from "./VerifyDiff/VerifyDiff";

import "../../../styles/react-semantic-alert.css";

const NAVIGATION_BLOCKER_MESSAGE =
  "A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave.";

export function ConfigChange() {
  const {
    state,
    dryRun,
    liveRun,
    confirmRun,
    allRepoJobs,
    commitTarget,
    isRepoRefreshing,
    deviceSyncStart,
    handleRepoRefreshing,
    handleDryRunReady,
    resetState,
    setSynctoForce,
  } = useConfigChange();

  return (
    <>
      <NavigationBlocker
        when={state.blockNavigation}
        message={NAVIGATION_BLOCKER_MESSAGE}
      />
      <SemanticToastContainer position="top-right" maxToasts={3} />
      <section>
        <SyncStatus
          devices={state.devices}
          synchistory={state.syncHistory}
          target={commitTarget}
        />
        <ConfigChangeStep1
          dryRunJobStatus={dryRun.status}
          setRepoWorking={(bool) => handleRepoRefreshing(bool)}
          onDryRunReady={() => handleDryRunReady()}
          repoJobs={allRepoJobs}
          logLines={state.logLines}
        />
        <DryRun
          dryRunDisable={state.dryRunDisable}
          dryRunSyncStart={deviceSyncStart}
          dryRunProgressData={state.dryRunProgressData}
          dryRunJobStatus={dryRun.status}
          jobId={dryRun.jobId}
          devices={dryRun.results}
          totalCount={state.dryRunTotalCount}
          logLines={state.logLines}
          resetState={resetState}
          repoWorkingState={isRepoRefreshing}
          synctoForce={state.synctoForce}
          setSynctoForce={setSynctoForce}
        />
        <VerifyDiff
          dryRunChangeScore={dryRun.changeScore}
          devices={dryRun.results}
        />
        <ConfigChangeStep4
          liveRunSyncStart={deviceSyncStart}
          liveRunProgressData={state.liveRunProgressData}
          liveRunJobStatus={liveRun.status}
          dryRunJobStatus={dryRun.status}
          jobId={liveRun.jobId}
          confirmRunProgressData={state.confirmRunProgressData}
          confirmRunJobStatus={confirmRun.status}
          confirmJobId={confirmRun.jobId}
          totalCount={state.liveRunTotalCount}
          logLines={state.logLines}
          dryRunChangeScore={dryRun.changeScore}
          synctoForce={state.synctoForce}
        />
      </section>
    </>
  );
}
