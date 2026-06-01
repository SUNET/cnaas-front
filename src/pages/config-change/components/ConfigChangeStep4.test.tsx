import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfigChangeStep4 } from "./ConfigChangeStep4";

import { useAuthToken as useAuthTokenImport } from "../../../stores/AuthTokenContext";
import { getData as getDataImport } from "../../../utils/getData";
import { makeJob } from "../../../test-utils/makeJob";

jest.mock("../../../utils/getData");
jest.mock("../../../stores/AuthTokenContext");

const mockGetData = getDataImport as jest.MockedFunction<typeof getDataImport>;
const mockUseAuthToken = useAuthTokenImport as jest.MockedFunction<
  typeof useAuthTokenImport
>;

mockGetData.mockResolvedValue({ api: { COMMIT_CONFIRMED_MODE: 1 } });
mockUseAuthToken.mockReturnValue({
  token: "mockToken",
  username: "test-user",
} as ReturnType<typeof useAuthTokenImport>);

const mockLiveRunSyncStart = jest.fn();

type RenderProps = {
  readonly dryRunJobStatus?: string;
  readonly liveRunJobStatus?: string;
};

function renderConfigChangeStep4Component({
  dryRunJobStatus = "FINISHED",
  liveRunJobStatus = "RUNNING",
}: RenderProps = {}) {
  render(
    <ConfigChangeStep4
      confirmJobId="1"
      confirmRunJobStatus="RUNNING"
      confirmRunProgressData={null}
      dryRunChangeScore={0}
      dryRunJobStatus={dryRunJobStatus}
      jobId="1"
      liveRunJobStatus={liveRunJobStatus}
      liveRunProgressData={makeJob({ finished_devices: ["dev1"] })}
      liveRunSyncStart={mockLiveRunSyncStart}
      logLines={["job #1 line1", "job #1 line2"]}
      synctoForce={false}
      totalCount={1}
    />,
  );
}

beforeEach(() => {
  mockGetData.mockClear();
});

test("render and make api call", async () => {
  await act(async () => renderConfigChangeStep4Component());

  await waitFor(() =>
    expect(mockGetData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/settings/server`,
      "mockToken",
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
  await act(async () => renderConfigChangeStep4Component());
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
