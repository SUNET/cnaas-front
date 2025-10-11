import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import DryRun from "./DryRun";

const mockDryRunSyncStart = jest.fn();
const mockResetState = jest.fn();

function renderDryRunComponent({ dryRunJobStatus = "" } = {}) {
  render(
    <DryRun
      dryRunDisable={false}
      dryRunSyncStart={mockDryRunSyncStart}
      dryRunProgressData={{}}
      dryRunJobStatus={dryRunJobStatus}
      jobId="NA"
      devices=""
      totalCount={1}
      logLines={[]}
      resetState={mockResetState}
      repoWorkingState=""
    />,
  );
}

test("loads and displays", async () => {
  renderDryRunComponent();
  expect(screen.getByText("Dry run (2/4)")).toBeInTheDocument();
  expect(screen.getByRole("checkbox")).toBeInTheDocument();
  const dryRunButton = screen.getByRole("button", { name: "Dry run" });
  expect(dryRunButton).toBeInTheDocument();
  expect(dryRunButton).toBeEnabled();
  const startOverButton = screen.getByRole("button", { name: "Start over" });
  expect(startOverButton).toBeInTheDocument();
  expect(startOverButton).toBeDisabled();
});

test("click dryrunButton", async () => {
  renderDryRunComponent();
  const dryRunButton = screen.getByRole("button", { name: "Dry run" });

  await userEvent.click(dryRunButton);

  expect(mockDryRunSyncStart).toHaveBeenCalledTimes(1);
});

test("click resetButton", async () => {
  renderDryRunComponent({
    dryRunJobStatus: "FINISHED",
  });
  const startOverButton = screen.getByRole("button", { name: "Start over" });

  await userEvent.click(startOverButton);
  expect(mockResetState).toHaveBeenCalledTimes(1);
});
