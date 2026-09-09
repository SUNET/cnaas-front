import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FirmwareStep2 } from "./FirmwareStep2";
import { fetchFirmwareFiles as fetchFirmwareFilesImport } from "../api/firmwareUpgradeApi";
import type { CpuArchitecture, DeviceArch } from "../../../types/device";

let mockTargetArch: DeviceArch | null = null;
let mockTargetDeviceArches: readonly CpuArchitecture[] = [];

jest.mock("../api/firmwareUpgradeApi");
jest.mock("../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));
jest.mock("../stores/FirmwareUpgradeContext", () => ({
  useFirmwareUpgrade: () => ({
    step2: { jobId: null, jobData: null, totalCount: 0 },
    logLines: [],
    targetArch: mockTargetArch,
    targetDeviceArches: mockTargetDeviceArches,
    skipStep2: jest.fn(),
    firmwareUpgradeStart: jest.fn(),
    firmwareUpgradeAbort: jest.fn(),
  }),
}));

const mockFetchFirmwareFiles = fetchFirmwareFilesImport as jest.MockedFunction<
  typeof fetchFirmwareFilesImport
>;

const originalDetectArch = process.env.ARISTA_DETECT_ARCH;

beforeEach(() => {
  jest.clearAllMocks();
  mockTargetArch = null;
  mockTargetDeviceArches = [];
  process.env.ARISTA_DETECT_ARCH = "true";
});

afterEach(() => {
  process.env.ARISTA_DETECT_ARCH = originalDetectArch;
});

async function openDropdown() {
  await userEvent.click(await screen.findByRole("combobox"));
}

test("lists EOSarm firmware as a selectable arm option", async () => {
  mockFetchFirmwareFiles.mockResolvedValue(["EOSarm-4.30.0.swi"]);

  render(<FirmwareStep2 />);
  await openDropdown();

  expect(
    await screen.findByRole("option", { name: /4\.30\.0\.swi \(arm\)/i }),
  ).toBeInTheDocument();
});

test("combines matching 32 and 64 bit images into one dual-arch option", async () => {
  mockFetchFirmwareFiles.mockResolvedValue([
    "EOS-4.30.0.swi",
    "EOS64-4.30.0.swi",
  ]);

  render(<FirmwareStep2 />);
  await openDropdown();

  expect(
    await screen.findByRole("option", { name: /4\.30\.0\.swi \(32\+64bit\)/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: /not dual-arch/i }),
  ).not.toBeInTheDocument();
});

test("hides arm firmware when target device is x86", async () => {
  mockTargetArch = "x86";
  mockFetchFirmwareFiles.mockResolvedValue([
    "EOSarm-4.30.0.swi",
    "EOS64-4.30.0.swi",
  ]);

  render(<FirmwareStep2 />);
  await openDropdown();

  expect(
    await screen.findByRole("option", { name: /4\.30\.0\.swi/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: /\(arm\)/i }),
  ).not.toBeInTheDocument();
});

test("hides x86 firmware when target device is arm", async () => {
  mockTargetArch = "arm";
  mockFetchFirmwareFiles.mockResolvedValue([
    "EOSarm-4.30.0.swi",
    "EOS64-4.30.0.swi",
  ]);

  render(<FirmwareStep2 />);
  await openDropdown();

  expect(
    await screen.findByRole("option", { name: /\(arm\)/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: /64-4\.30\.0\.swi/i }),
  ).not.toBeInTheDocument();
});

test("allows a 64-bit-only image when no 32-bit devices are targeted", async () => {
  mockTargetDeviceArches = ["X86_64"];
  mockFetchFirmwareFiles.mockResolvedValue(["EOS64-4.30.0.swi"]);

  render(<FirmwareStep2 />);
  await openDropdown();

  const option = await screen.findByRole("option", {
    name: /not dual-arch/i,
  });
  expect(option).not.toHaveAttribute("aria-disabled", "true");
});

test("disables a 64-bit-only image when a 32-bit device is targeted but no matching EOS- file exists", async () => {
  mockTargetDeviceArches = ["X86_32", "X86_64"];
  mockFetchFirmwareFiles.mockResolvedValue(["EOS64-4.30.0.swi"]);

  render(<FirmwareStep2 />);
  await openDropdown();

  const option = await screen.findByRole("option", {
    name: /missing 32-bit image/i,
  });
  expect(option).toHaveAttribute("aria-disabled", "true");
});

test("allows a 32-bit-only image when no 64-bit devices are targeted", async () => {
  mockTargetDeviceArches = ["X86_32"];
  mockFetchFirmwareFiles.mockResolvedValue(["EOS-4.30.0.swi"]);

  render(<FirmwareStep2 />);
  await openDropdown();

  const option = await screen.findByRole("option", {
    name: /not dual-arch/i,
  });
  expect(option).not.toHaveAttribute("aria-disabled", "true");
});

test("disables a 32-bit-only image when a 64-bit device is targeted but no matching EOS64- file exists", async () => {
  mockTargetDeviceArches = ["X86_32", "X86_64"];
  mockFetchFirmwareFiles.mockResolvedValue(["EOS-4.30.0.swi"]);

  render(<FirmwareStep2 />);
  await openDropdown();

  const option = await screen.findByRole("option", {
    name: /missing 64-bit image/i,
  });
  expect(option).toHaveAttribute("aria-disabled", "true");
});
