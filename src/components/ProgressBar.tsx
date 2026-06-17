import { Progress } from "semantic-ui-react";

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
  let active = false;
  let disabled = true;
  let success = false;
  let error = false;

  if (jobStatus !== undefined) {
    switch (jobStatus) {
      case "SCHEDULED":
        disabled = false;
        break;
      case "RUNNING":
      case "ABORTING":
        disabled = false;
        active = true;
        break;
      case "FINISHED":
        if (value === total) {
          success = true;
        } else {
          error = true;
        }
        break;
      case "EXCEPTION":
        error = true;
        break;
      case "ABORTED":
        error = true;
        break;
      case null:
        disabled = true;
        break;
      case "":
        disabled = true;
        break;
      default:
        console.error(`unrecognized job status: ${jobStatus}`);
    }
  }

  return (
    <div id="progressbar" hidden={hidden}>
      <Progress
        value={value}
        total={total}
        progress
        precision={0}
        color="orange"
        disabled={disabled}
        active={active}
        success={success}
        error={error}
      />
      <label>
        {value}/{total} devices finished
      </label>
    </div>
  );
}

export default ProgressBar;
