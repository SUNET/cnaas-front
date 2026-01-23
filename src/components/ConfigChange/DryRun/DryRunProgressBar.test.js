import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DryRunProgressBar } from "./DryRunProgressBar";

jest.mock("../../ProgressBar", () => {
  return function MockProgressBar({ value, total, jobStatus, hidden }) {
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

function renderComponent(props = {}) {
  const defaultProps = {
    dryRunProgressData: {},
    dryRunJobStatus: null,
    totalDevices: 5,
  };
  return render(<DryRunProgressBar {...defaultProps} {...props} />);
}

test("displays finished device count when job is RUNNING", () => {
  const progressData = {
    finished_devices: ["switch-01", "switch-02", "switch-03"],
  };

  renderComponent({
    dryRunProgressData: progressData,
    dryRunJobStatus: "RUNNING",
    totalDevices: 5,
  });

  expect(screen.getByText("3/5 devices finished")).toBeInTheDocument();
});

test("displays finished device count when job is FINISHED", () => {
  const progressData = {
    finished_devices: [
      "switch-01",
      "switch-02",
      "switch-03",
      "switch-04",
      "switch-05",
    ],
  };

  renderComponent({
    dryRunProgressData: progressData,
    dryRunJobStatus: "FINISHED",
    totalDevices: 5,
  });

  expect(screen.getByText("5/5 devices finished")).toBeInTheDocument();
});

test("displays 0 finished when job status is SCHEDULED", () => {
  renderComponent({
    dryRunProgressData: {},
    dryRunJobStatus: "SCHEDULED",
    totalDevices: 5,
  });

  expect(screen.getByText("0/5 devices finished")).toBeInTheDocument();
});

test("displays 0 finished when progressData is empty", () => {
  renderComponent({
    dryRunProgressData: {},
    dryRunJobStatus: "RUNNING",
    totalDevices: 5,
  });

  expect(screen.getByText("0/5 devices finished")).toBeInTheDocument();
});
