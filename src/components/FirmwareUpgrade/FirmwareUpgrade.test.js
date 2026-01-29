import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import { FirmwareUpgrade } from "./FirmwareUpgrade";
import { getData as mockGetData } from "../../utils/getData";
import { post as mockPost } from "../../utils/sendData";

jest.mock("../../utils/getData");
jest.mock("../../utils/sendData");
jest.mock("../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));
jest.mock("../../hooks/useFreshRef.js", () => ({
  useFreshRef: (value) => ({ current: value }),
}));

const mockSocketOn = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketOff = jest.fn();
jest.mock("socket.io-client", () => {
  return jest.fn(() => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
    off: mockSocketOff,
  }));
});

beforeEach(() => {
  jest.clearAllMocks();
});

function renderComponent(search = "?hostname=test-switch") {
  return render(
    <MemoryRouter>
      <FirmwareUpgrade location={{ search }} />
    </MemoryRouter>,
  );
}

test("renders firmware upgrade page with target hostname", async () => {
  mockGetData.mockImplementation((url) => {
    if (url.includes("/devices")) {
      return Promise.resolve({
        data: {
          devices: [{ hostname: "test-switch", os_version: "4.28.0F" }],
        },
      });
    }
    if (url.includes("/firmware")) {
      return Promise.resolve({
        data: {
          files: ["EOS-4.29.0F.swi", "EOS-4.30.0F.swi"],
        },
      });
    }
    return Promise.resolve({ data: {} });
  });

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

test("step 2: user selects firmware file and starts activation job", async () => {
  mockGetData.mockImplementation((url) => {
    if (url.includes("/devices")) {
      return Promise.resolve({
        data: {
          devices: [{ hostname: "test-switch", os_version: "4.28.0F" }],
        },
      });
    }
    if (url.includes("/api/v1.0/firmware")) {
      return Promise.resolve({
        data: {
          files: ["firmware-4.29.0.bin", "firmware-4.30.0.bin"],
        },
      });
    }
    if (url.includes("/job/")) {
      return Promise.resolve({
        data: {
          jobs: [
            {
              status: "FINISHED",
              result: { devices: {} },
              finished_devices: ["test-switch"],
              start_time: "2026-01-22 10:00:00",
              finish_time: "2026-01-22 10:05:00",
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: {} });
  });

  mockPost.mockResolvedValue({
    headers: { get: () => "1" },
    json: async () => ({ job_id: 123 }),
  });

  renderComponent();

  const startButton = await screen.findByRole("button", {
    name: /start activate firmware/i,
  });
  expect(startButton).toBeDisabled();

  const dropdown = await screen.findByRole("listbox");
  await userEvent.click(dropdown);

  const firmwareOption = await screen.findByRole("option", {
    name: /firmware-4.29.0.bin/,
  });
  await userEvent.click(firmwareOption);

  await waitFor(() => {
    expect(startButton).toBeEnabled();
  });

  await userEvent.click(startButton);

  await waitFor(() => {
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
    );
  });
});

test("step 3: user starts reboot after skipping step 2", async () => {
  mockGetData.mockImplementation((url) => {
    if (url.includes("/devices")) {
      return Promise.resolve({
        data: {
          devices: [{ hostname: "test-switch", os_version: "4.28.0F" }],
        },
      });
    }
    if (url.includes("/api/v1.0/firmware")) {
      return Promise.resolve({
        data: {
          files: ["firmware-4.29.0.bin"],
        },
      });
    }
    if (url.includes("/job/")) {
      return Promise.resolve({
        data: {
          jobs: [
            {
              status: "FINISHED",
              result: { devices: {} },
              finished_devices: ["test-switch"],
              start_time: "2026-01-22 10:00:00",
              finish_time: "2026-01-22 10:05:00",
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: {} });
  });

  mockPost.mockResolvedValue({
    headers: { get: () => "1" },
    json: async () => ({ job_id: 456 }),
  });

  renderComponent();

  // Must select firmware first before skip button is enabled
  const dropdown = await screen.findByRole("listbox");
  await userEvent.click(dropdown);
  const firmwareOption = await screen.findByRole("option", {
    name: /firmware-4.29.0.bin/,
  });
  await userEvent.click(firmwareOption);

  // Skip step 2 to activate step 3
  const skipButton = await screen.findByRole("button", {
    name: /skip to step 3/i,
  });
  await waitFor(() => {
    expect(skipButton).toBeEnabled();
  });
  await userEvent.click(skipButton);

  // Confirm skip dialog
  const confirmSkipButton = await screen.findByRole("button", { name: /ok/i });
  await userEvent.click(confirmSkipButton);

  // Step 3 button should now be enabled
  const step3Button = await screen.findByRole("button", {
    name: /start reboots/i,
  });

  await waitFor(() => {
    expect(step3Button).toBeEnabled();
  });

  await userEvent.click(step3Button);

  // Confirm reboot dialog appears
  const confirmButtons = await screen.findAllByRole("button", { name: /ok/i });
  // Click the second OK button (for reboot confirmation)
  await userEvent.click(confirmButtons[confirmButtons.length - 1]);

  await waitFor(() => {
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1.0/firmware/upgrade"),
      "test-token",
      expect.objectContaining({
        hostname: "test-switch",
        post_flight: true,
        reboot: true,
      }),
    );
  });
});
