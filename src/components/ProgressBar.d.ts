import { type ComponentType } from "react";

interface ProgressBarProps {
  readonly jobStatus?: string | null;
  readonly value: number;
  readonly total: number;
  readonly hidden?: boolean;
}

declare const ProgressBar: ComponentType<ProgressBarProps>;
export default ProgressBar;
