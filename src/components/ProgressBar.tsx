import LinearProgress from "@mui/material/LinearProgress";

type ProgressBarProps = {
  readonly jobStatus?: string | null;
  readonly value: number;
  readonly total: number;
  readonly hidden?: boolean;
};

function ProgressBar({
  jobStatus = null,
  value,
  total,
  hidden = false,
}: ProgressBarProps) {
  let color: "secondary" | "success" | "error" | "inherit" = "secondary";
  let disabled = true;

  if (jobStatus !== undefined) {
    switch (jobStatus) {
      case "SCHEDULED":
        disabled = false;
        break;
      case "RUNNING":
      case "ABORTING":
        disabled = false;
        break;
      case "FINISHED":
        disabled = false;
        color = value === total ? "success" : "error";
        break;
      case "EXCEPTION":
      case "ABORTED":
        disabled = false;
        color = "error";
        break;
      case null:
      case "":
        disabled = true;
        break;
      default:
        console.error(`unrecognized job status: ${jobStatus}`);
    }
  }

  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div id="progressbar" hidden={hidden}>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={disabled ? "inherit" : color}
        sx={{ opacity: disabled ? 0.4 : 1 }}
      />
      <label>
        {value}/{total} devices finished
      </label>
    </div>
  );
}

export default ProgressBar;
