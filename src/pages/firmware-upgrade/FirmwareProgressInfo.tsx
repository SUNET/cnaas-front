import LogViewer from "../../components/LogViewer";
import { matchesJobId, type Job } from "../../types/job";

type FirmwareProgressInfoProps = {
  readonly jobStatus?: string | null;
  readonly jobId?: number | null;
  readonly jobData?: Job | null;
  readonly logLines: readonly string[];
};

export function FirmwareProgressInfo({
  jobStatus,
  jobId,
  jobData,
  logLines,
}: FirmwareProgressInfoProps) {
  const jobStartTime = jobData?.start_time ?? "";
  const jobFinishTime = jobData?.finish_time ?? "";
  const exceptionMessage =
    jobStatus === "EXCEPTION" ? jobData?.exception?.message : "";

  return (
    <div key={`fw_progess_info_${jobId}`}>
      <p>
        status: {jobStatus} (job #{jobId})
      </p>
      <p className="error">{exceptionMessage}</p>
      <p>start time: {jobStartTime}</p>
      <p>finish time: {jobFinishTime}</p>
      <LogViewer
        logs={jobId == null ? [] : logLines.filter(matchesJobId(jobId))}
      />
    </div>
  );
}
