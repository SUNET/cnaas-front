import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DryRun } from "./DryRun";

jest.mock("./DryRunError", () => {
  return function MockDryRunError() {
    return <p className="error">Dry run error occurred</p>;
  };
});

jest.mock("./DryRunProgressBar", () => ({
  DryRunProgressBar: function MockDryRunProgressBar() {
    return null;
  },
}));

jest.mock("./DryRunProgressInfo", () => ({
  DryRunProgressInfo: function MockDryRunProgressInfo() {
    return null;
  },
}));

const mockDryRunSyncStart = jest.fn();
const mockResetState = jest.fn();
const mockSetSynctoForce = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function renderComponent(props = {}) {
  const defaultProps = {
    dryRunDisable: false,
    dryRunSyncStart: mockDryRunSyncStart,
    dryRunProgressData: {},
    dryRunJobStatus: "",
    jobId: "NA",
    devices: {},
    totalCount: 1,
    logLines: [],
    resetState: mockResetState,
    repoWorkingState: false,
    synctoForce: false,
    setSynctoForce: mockSetSynctoForce,
  };
  return render(<DryRun {...defaultProps} {...props} />);
}

test("displays heading, checkbox, and buttons", () => {
  renderComponent();

  expect(screen.getByText("Dry run (2/4)")).toBeInTheDocument();
  expect(screen.getByRole("checkbox")).toBeInTheDocument();
  expect(screen.getByText(/re-sync devices/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dry run" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Start over" })).toBeDisabled();
});

test("calls dryRunSyncStart with resync false when clicking Dry run", async () => {
  renderComponent();

  await userEvent.click(screen.getByRole("button", { name: "Dry run" }));

  expect(mockDryRunSyncStart).toHaveBeenCalledWith({ resync: false });
});

test("calls dryRunSyncStart with resync true when checkbox is checked", async () => {
  renderComponent();

  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(screen.getByRole("button", { name: "Dry run" }));

  expect(mockDryRunSyncStart).toHaveBeenCalledWith({ resync: true });
});

test("calls resetState when clicking Start over", async () => {
  renderComponent({ dryRunJobStatus: "FINISHED" });

  await userEvent.click(screen.getByRole("button", { name: "Start over" }));

  expect(mockResetState).toHaveBeenCalledTimes(1);
});

test("disables Dry run button when dryRunDisable is true", () => {
  renderComponent({ dryRunDisable: true });

  expect(screen.getByRole("button", { name: "Dry run" })).toBeDisabled();
});

test("disables Dry run button when repoWorkingState is true", () => {
  renderComponent({ repoWorkingState: true });

  expect(screen.getByRole("button", { name: "Dry run" })).toBeDisabled();
});

test("enables Start over button when job status is FINISHED", () => {
  renderComponent({ dryRunJobStatus: "FINISHED" });

  expect(screen.getByRole("button", { name: "Start over" })).toBeEnabled();
});

test("displays DryRunError when job status is EXCEPTION", () => {
  renderComponent({ dryRunJobStatus: "EXCEPTION" });

  expect(screen.getByText("Dry run error occurred")).toBeInTheDocument();
});

test("does not display DryRunError when job status is not EXCEPTION", () => {
  renderComponent({ dryRunJobStatus: "FINISHED" });

  expect(screen.queryByText("Dry run error occurred")).not.toBeInTheDocument();
});
