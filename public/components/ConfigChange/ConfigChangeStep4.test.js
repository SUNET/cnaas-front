import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import ConfigChangeStep4 from "./ConfigChangeStep4";

import { getData as mockGetData } from "../../utils/getData";

jest.mock("../../utils/getData");
mockGetData.mockResolvedValue({ api: { COMMIT_CONFIRMED_MODE: 1 } });

const mockLiveRunSyncStart = jest.fn();

function renderConfigChangeStep4Component({
  dryRunJobStatus = "FINISHED",
  liveRunJobStatus = "RUNNING",
} = {}) {
  render(
    <ConfigChangeStep4
      confirmJobId="1"
      confirmRunJobStatus="RUNNING"
      confirmRunProgressData={[]}
      dryRunChangeScore={0}
      dryRunJobStatus={dryRunJobStatus}
      jobId="1"
      liveRunJobStatus={liveRunJobStatus}
      liveRunProgressData={{ finished_devices: ["dev1"] }}
      liveRunSyncStart={mockLiveRunSyncStart}
      logLines={["job #1 line1", "job #1 line2"]}
      synctoForce={false}
      totalCount={1}
    />,
  );
}

beforeEach(() => {
  mockGetData.mockClear();
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockReturnValue("localStorageMockValue");
});

afterAll(() => {
  global.Storage.prototype.getItem.mockReset();
});

test("render and make api call", async () => {
  act(() => renderConfigChangeStep4Component());

  await waitFor(() =>
    expect(mockGetData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/settings/server`,
      "localStorageMockValue",
    ),
  );
  expect(screen.getByPlaceholderText("comment")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("ticket reference")).toBeInTheDocument();
  const deployButton = screen.getByRole("button", {
    name: "Deploy change (live run)",
  });
  expect(deployButton).toBeInTheDocument();
  expect(deployButton).toBeDisabled();
  expect(
    screen.getByText("commit confirm mode (use server default)"),
  ).toBeInTheDocument();
});

test("deploy button disabled", async () => {
  act(() => renderConfigChangeStep4Component());
  const deployButton = screen.getByRole("button", {
    name: "Deploy change (live run)",
  });
  expect(deployButton).toBeDisabled();
});

test("deploy button enabled", async () => {
  await waitFor(() => {
    act(() =>
      renderConfigChangeStep4Component({
        liveRunJobStatus: "",
        dryRunJobStatus: "FINISHED",
      }),
    );
  });
  const deployButton = screen.getByRole("button", {
    name: "Deploy change (live run)",
  });
  expect(deployButton).toBeEnabled();
});

test("deploy change", async () => {
  await waitFor(() => {
    act(() => renderConfigChangeStep4Component({ liveRunJobStatus: "" }));
  });
  const deployButton = screen.getByRole("button", {
    name: "Deploy change (live run)",
  });
  expect(deployButton).toBeEnabled();

  // enter a comment
  const inputComment = screen.getByPlaceholderText("comment");
  await userEvent.type(inputComment, "a comment");

  // enter a ticket reference
  const inputTicketRef = screen.getByPlaceholderText("ticket reference");
  await userEvent.type(inputTicketRef, "a ticket ref");

  // select a commit confirm mode
  const selectConfirm = screen.getByText(
    "commit confirm mode (use server default)",
  );
  await userEvent.click(selectConfirm);
  const option2 = screen.getByText("mode 2: per-job confirm");
  await userEvent.click(option2);

  // click deploy
  await userEvent.click(deployButton);
  const confirmDiag = await screen.findByText(
    "Are you sure you want to commit changes to devices and overwrite any local changes?",
  );
  expect(confirmDiag).toBeInTheDocument();

  const okButton = screen.getByRole("button", {
    name: "OK",
  });
  await userEvent.click(okButton);

  expect(mockLiveRunSyncStart).toHaveBeenCalledWith({
    dry_run: false,
    comment: "a comment",
    ticket_ref: "a ticket ref",
    confirm_mode: 2,
  });
});
