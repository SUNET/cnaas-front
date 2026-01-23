import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DryRunProgressInfo } from "./DryRunProgressInfo";

// Mock LogViewer to avoid testing its internals (Prism highlighting, etc.)
jest.mock("../../LogViewer", () => {
  return function MockLogViewer({ logs }) {
    return (
      <section aria-label="log viewer">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </section>
    );
  };
});

function renderComponent(props = {}) {
  const defaultProps = {
    dryRunJobStatus: "RUNNING",
    dryRunProgressData: {},
    jobId: 123,
    logLines: [],
  };
  return render(<DryRunProgressInfo {...defaultProps} {...props} />);
}

test("displays job status and ID", () => {
  renderComponent({ dryRunJobStatus: "RUNNING", jobId: 456 });

  expect(screen.getByText(/status: RUNNING \(job #456\)/)).toBeInTheDocument();
});

test("displays start and finish times when progress data exists", () => {
  renderComponent({
    dryRunProgressData: {
      start_time: "2024-01-15 10:30:00",
      finish_time: "2024-01-15 10:35:00",
    },
  });

  expect(
    screen.getByText(/start time: 2024-01-15 10:30:00/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/finish time: 2024-01-15 10:35:00/),
  ).toBeInTheDocument();
});

test("displays empty times when progress data is empty", () => {
  renderComponent({ dryRunProgressData: {} });

  expect(screen.getByText("start time:")).toBeInTheDocument();
  expect(screen.getByText("finish time:")).toBeInTheDocument();
});

test("displays exception message when job status is EXCEPTION", () => {
  renderComponent({
    dryRunJobStatus: "EXCEPTION",
    dryRunProgressData: {
      start_time: "2024-01-15 10:30:00",
      exception: { message: "Something went wrong" },
    },
  });

  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
});

test("displays LogViewer with logs filtered by job ID", () => {
  const logLines = [
    "INFO: Job #123 started",
    "INFO: Job #456 started",
    "DEBUG: Job #123 processing",
    "ERROR: Job #789 failed",
    "INFO: job #123 completed", // lowercase to test case-insensitive matching
  ];

  renderComponent({ jobId: 123, logLines });

  const logViewer = screen.getByRole("region", { name: /log viewer/i });
  expect(logViewer).toBeInTheDocument();

  // Should only show logs containing "job #123" (case-insensitive)
  expect(screen.getByText("INFO: Job #123 started")).toBeInTheDocument();
  expect(screen.getByText("DEBUG: Job #123 processing")).toBeInTheDocument();
  expect(screen.getByText("INFO: job #123 completed")).toBeInTheDocument();

  // Should not show logs for other jobs
  expect(screen.queryByText("INFO: Job #456 started")).not.toBeInTheDocument();
  expect(screen.queryByText("ERROR: Job #789 failed")).not.toBeInTheDocument();
});

test("does not display LogViewer when logLines is empty", () => {
  renderComponent({ logLines: [] });

  expect(
    screen.queryByRole("region", { name: /log viewer/i }),
  ).not.toBeInTheDocument();
});

test("does not display LogViewer when logLines is undefined", () => {
  renderComponent({ logLines: undefined });

  expect(
    screen.queryByRole("region", { name: /log viewer/i }),
  ).not.toBeInTheDocument();
});
