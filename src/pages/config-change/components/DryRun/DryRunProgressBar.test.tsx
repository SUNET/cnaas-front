import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DryRunProgressBar } from "./DryRunProgressBar";
import type { Job } from "../../../../types/job";
import { makeJob } from "../../../../test-utils/makeJob";

type MockProgressBarProps = {
  readonly value: number;
  readonly total: number;
  readonly jobStatus: string | null;
  readonly hidden?: boolean;
};

jest.mock("../../../../components/ProgressBar", () => {
  return function MockProgressBar({
    value,
    total,
    jobStatus,
    hidden,
  }: MockProgressBarProps) {
    return (
      <div
        data-testid="progress-bar"
        data-value={value}
        data-total={total}
        data-status={jobStatus}
        data-hidden={hidden}
      >
        {value}/{total} devices finished
      </div>
    );
  };
});

type RenderProps = {
  readonly dryRunProgressData?: Job | null;
  readonly dryRunJobStatus?: string | null;
  readonly totalDevices?: number;
};

function renderComponent(props: RenderProps = {}) {
  const defaultProps = {
    dryRunProgressData: null,
    dryRunJobStatus: null,
    totalDevices: 5,
  };
  return render(<DryRunProgressBar {...defaultProps} {...props} />);
}

test("displays finished device count when job is RUNNING", () => {
  const progressData = makeJob({
    finished_devices: ["switch-01", "switch-02", "switch-03"],
  });

  renderComponent({
    dryRunProgressData: progressData,
    dryRunJobStatus: "RUNNING",
    totalDevices: 5,
  });

  expect(screen.getByText("3/5 devices finished")).toBeInTheDocument();
});

test("displays finished device count when job is FINISHED", () => {
  const progressData = makeJob({
    finished_devices: [
      "switch-01",
      "switch-02",
      "switch-03",
      "switch-04",
      "switch-05",
    ],
  });

  renderComponent({
    dryRunProgressData: progressData,
    dryRunJobStatus: "FINISHED",
    totalDevices: 5,
  });

  expect(screen.getByText("5/5 devices finished")).toBeInTheDocument();
});

test("displays 0 finished when job status is SCHEDULED", () => {
  renderComponent({
    dryRunProgressData: null,
    dryRunJobStatus: "SCHEDULED",
    totalDevices: 5,
  });

  expect(screen.getByText("0/5 devices finished")).toBeInTheDocument();
});

test("displays 0 finished when progressData is empty", () => {
  renderComponent({
    dryRunProgressData: null,
    dryRunJobStatus: "RUNNING",
    totalDevices: 5,
  });

  expect(screen.getByText("0/5 devices finished")).toBeInTheDocument();
});
