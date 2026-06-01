import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";

import { FirmwareUpgradePage } from "./FirmwareUpgradePage";
import { getData as getDataImport } from "../../utils/getData";
import {
  post as postImport,
  putData as putDataImport,
} from "../../utils/sendData";
import { makeJob } from "../../test-utils/makeJob";
import type { Job } from "../../types/job";

jest.mock("../../utils/getData");
jest.mock("../../utils/sendData");
jest.mock("../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));
jest.mock("../../hooks/useFreshRef", () => ({
  useFreshRef: (value: unknown) => ({ current: value }),
}));

jest.mock("./stores/socket", () => ({
  socket: {
    io: { opts: {} },
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

const mockGetData = getDataImport as jest.MockedFunction<typeof getDataImport>;
const mockPost = postImport as jest.MockedFunction<typeof postImport>;
const mockPutData = putDataImport as jest.MockedFunction<typeof putDataImport>;

beforeEach(() => {
  jest.clearAllMocks();
});

const DEVICE = { hostname: "test-switch", os_version: "4.28.0F" };

type GetDataOptions = {
  readonly devices?: ReadonlyArray<{ hostname: string; os_version: string }>;
  readonly files?: readonly string[];
  readonly groups?: Record<string, Record<string, string[]>>;
  readonly job?: Job;
};

function mockGetDataResponses({
  devices = [DEVICE],
  files = ["firmware-4.29.0.bin", "firmware-4.30.0.bin"],
  groups,
  job,
}: GetDataOptions = {}) {
  mockGetData.mockImplementation((url: string) => {
    if (url.includes("/groups/")) {
      return Promise.resolve({ data: { groups: groups ?? {} } });
    }
    if (url.includes("/devices")) {
      return Promise.resolve({ data: { devices } });
    }
    if (url.includes("/api/v1.0/firmware")) {
      return Promise.resolve({ data: { files } });
    }
    if (url.includes("/job/")) {
      return Promise.resolve({ data: { jobs: [job] } });
    }
    return Promise.resolve({ data: {} });
  });
}

/** A partial Response good enough for the upgrade-start flow (header + json). */
function upgradeResponse(jobId: number): Response {
  return {
    headers: { get: () => "1" },
    json: async () => ({ job_id: jobId }),
  } as unknown as Response;
}

/**
 * The BE returns most upgrade validation errors as HTTP 200 with
 * { status: "error", message } and no job_id.
 */
function upgradeErrorResponse(message: string): Response {
  return {
    headers: { get: () => "1" },
    json: async () => ({ status: "error", message }),
  } as unknown as Response;
}

function renderComponent(search = "?hostname=test-switch") {
  const router = createMemoryRouter(
    [{ path: "/firmware-upgrade", element: <FirmwareUpgradePage /> }],
    { initialEntries: [`/firmware-upgrade${search}`] },
  );
  return render(<RouterProvider router={router} />);
}

async function selectFirmware(name: RegExp) {
  const dropdown = await screen.findByRole("listbox");
  await userEvent.click(dropdown);
  const option = await screen.findByRole("option", { name });
  await userEvent.click(option);
}

test("renders firmware upgrade page with target hostname", async () => {
  mockGetDataResponses();

  renderComponent();

  expect(screen.getByText("Firmware upgrade")).toBeInTheDocument();
  expect(
    screen.getByText("Firmware upgrade target hostname: test-switch"),
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("Current OS version (1/3)")).toBeInTheDocument();
  });
  expect(screen.getByText("Activate firmware (2/3)")).toBeInTheDocument();
  expect(screen.getByText("Reboot devices (3/3)")).toBeInTheDocument();
});

test("renders firmware upgrade page with target group", async () => {
  mockGetDataResponses({
    groups: { "test-group": { "4.28.0F": ["dev1", "dev2"] } },
  });

  renderComponent("?group=test-group");

  expect(
    screen.getByText("Firmware upgrade target group: test-group"),
  ).toBeInTheDocument();

  expect(await screen.findByText("4.28.0F:")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "dev1" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "dev2" })).toBeInTheDocument();
});

test("step 2: user selects firmware file and starts activation job", async () => {
  mockGetDataResponses({
    files: ["firmware-4.29.0.bin", "firmware-4.30.0.bin"],
    job: makeJob({
      status: "FINISHED",
      result: { devices: {} },
      finished_devices: ["test-switch"],
    }),
  });
  mockPost.mockResolvedValue(upgradeResponse(123));

  renderComponent();

  const startButton = await screen.findByRole("button", {
    name: /start activate firmware/i,
  });
  expect(startButton).toBeDisabled();

  await selectFirmware(/firmware-4.29.0.bin/);

  await waitFor(() => expect(startButton).toBeEnabled());
  await userEvent.click(startButton);

  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1.0/firmware/upgrade"),
      "test-token",
      expect.objectContaining({
        hostname: "test-switch",
        filename: "firmware-4.29.0.bin",
        activate: true,
        download: true,
        pre_flight: true,
      }),
    ),
  );
});

test("step 3: user starts reboot after skipping step 2", async () => {
  mockGetDataResponses({
    files: ["firmware-4.29.0.bin"],
    job: makeJob({
      status: "FINISHED",
      result: { devices: {} },
      finished_devices: ["test-switch"],
    }),
  });
  mockPost.mockResolvedValue(upgradeResponse(456));

  renderComponent();

  await selectFirmware(/firmware-4.29.0.bin/);

  const skipButton = await screen.findByRole("button", {
    name: /skip to step 3/i,
  });
  await waitFor(() => expect(skipButton).toBeEnabled());
  await userEvent.click(skipButton);

  const confirmSkipButton = await screen.findByRole("button", { name: /ok/i });
  await userEvent.click(confirmSkipButton);

  const step3Button = await screen.findByRole("button", {
    name: /start reboots/i,
  });
  await waitFor(() => expect(step3Button).toBeEnabled());
  await userEvent.click(step3Button);

  const confirmButtons = await screen.findAllByRole("button", { name: /ok/i });
  await userEvent.click(confirmButtons[confirmButtons.length - 1]);

  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1.0/firmware/upgrade"),
      "test-token",
      expect.objectContaining({
        hostname: "test-switch",
        post_flight: true,
        reboot: true,
      }),
    ),
  );
});

test("step 2: an EXCEPTION job surfaces the failed devices", async () => {
  mockGetDataResponses({
    files: ["firmware-4.29.0.bin"],
    job: makeJob({
      status: "EXCEPTION",
      result: { devices: { dev1: { failed: true }, dev2: { failed: false } } },
    }),
  });
  mockPost.mockResolvedValue(upgradeResponse(123));

  renderComponent();

  await selectFirmware(/firmware-4.29.0.bin/);
  const startButton = await screen.findByRole("button", {
    name: /start activate firmware/i,
  });
  await waitFor(() => expect(startButton).toBeEnabled());
  await userEvent.click(startButton);

  expect(await screen.findByText("dev1")).toBeInTheDocument();
  expect(screen.queryByText("dev2")).not.toBeInTheDocument();
});

test("step 2: a 200-status body error surfaces the message without polling", async () => {
  mockGetDataResponses({ files: ["firmware-4.29.0.bin"] });
  mockPost.mockResolvedValue(
    upgradeErrorResponse("No devices to upgrade matched filter"),
  );

  renderComponent();

  await selectFirmware(/firmware-4.29.0.bin/);
  const startButton = await screen.findByRole("button", {
    name: /start activate firmware/i,
  });
  await waitFor(() => expect(startButton).toBeEnabled());
  await userEvent.click(startButton);

  expect(
    await screen.findByText("No devices to upgrade matched filter"),
  ).toBeInTheDocument();

  const polledForJob = mockGetData.mock.calls.some(([url]) =>
    String(url).includes("/job/"),
  );
  expect(polledForJob).toBe(false);
});

test("step 2: a finished activation job activates step 3", async () => {
  mockGetDataResponses({
    files: ["firmware-4.29.0.bin"],
    job: makeJob({
      status: "FINISHED",
      result: { devices: {} },
      finished_devices: ["test-switch"],
    }),
  });
  mockPost.mockResolvedValue(upgradeResponse(123));

  renderComponent();

  // Step 3's start button is disabled until step 2 finishes.
  const step3Button = await screen.findByRole("button", {
    name: /start reboots/i,
  });
  expect(step3Button).toBeDisabled();

  await selectFirmware(/firmware-4.29.0.bin/);
  const startButton = await screen.findByRole("button", {
    name: /start activate firmware/i,
  });
  await waitFor(() => expect(startButton).toBeEnabled());
  await userEvent.click(startButton);

  // Polling sees a terminal (FINISHED) job and flips activateStep3, which
  // enables step 3.
  await waitFor(() => expect(step3Button).toBeEnabled());
});

test("step 2: aborting a running job sends an ABORT request", async () => {
  mockGetDataResponses({
    files: ["firmware-4.29.0.bin"],
    job: makeJob({ status: "RUNNING" }),
  });
  mockPost.mockResolvedValue(upgradeResponse(123));
  // putData resolves to parsed JSON (no Response/headers), matching the real
  // transport. The abort envelope carries the updated job (now ABORTING).
  mockPutData.mockResolvedValue({
    status: "success",
    data: { jobs: [makeJob({ id: 123, status: "ABORTING" })] },
  });

  renderComponent();

  await selectFirmware(/firmware-4.29.0.bin/);
  const startButton = await screen.findByRole("button", {
    name: /start activate firmware/i,
  });
  await waitFor(() => expect(startButton).toBeEnabled());
  await userEvent.click(startButton);

  const abortButton = (
    await screen.findAllByRole("button", { name: /abort/i })
  )[0];
  await waitFor(() => expect(abortButton).toBeEnabled());
  await userEvent.click(abortButton);

  await waitFor(() =>
    expect(mockPutData).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1.0/job/123"),
      "test-token",
      expect.objectContaining({
        action: "ABORT",
        abort_reason: "Aborted from WebUI",
      }),
    ),
  );
});
