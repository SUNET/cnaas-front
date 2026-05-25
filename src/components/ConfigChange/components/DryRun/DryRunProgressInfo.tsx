import LogViewer from "../../../LogViewer";
import type { JobProgress } from "../../stores/configChangeReducer";

interface DryRunProgressInfoProps {
  readonly dryRunJobStatus: string;
  readonly dryRunProgressData: JobProgress;
  readonly jobId: number | string;
  readonly logLines?: string[];
  readonly hidden?: boolean;
  readonly keyNum?: number;
}

export function DryRunProgressInfo({
  dryRunJobStatus,
  dryRunProgressData,
  jobId,
  logLines,
  hidden = false,
  keyNum = 1,
}: DryRunProgressInfoProps) {
  const jobStartTime = dryRunProgressData?.start_time ?? "";
  const jobFinishTime = dryRunProgressData?.finish_time ?? "";
  const exceptionMessage =
    dryRunJobStatus === "EXCEPTION"
      ? (dryRunProgressData?.exception?.message ?? "")
      : "";

  const filterJobId = (id: number | string) => {
    return function (logLine: string) {
      return logLine.toLowerCase().includes(`job #${id}`);
    };
  };

  const logViewer =
    logLines != null && logLines.length > 0 ? (
      <LogViewer logs={logLines.filter(filterJobId(jobId))} />
    ) : null;

  return (
    <div key={300 + keyNum} hidden={hidden}>
      <p>
        status: {dryRunJobStatus} (job #{jobId})
      </p>
      <p className="error">{exceptionMessage}</p>
      <p>start time: {jobStartTime}</p>
      <p>finish time: {jobFinishTime}</p>
      {logViewer}
    </div>
  );
}
