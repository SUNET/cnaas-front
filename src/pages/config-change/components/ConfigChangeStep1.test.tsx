import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router";

import { ConfigChangeStep1 } from "./ConfigChangeStep1";
import { ConfigChangeProvider } from "../stores/ConfigChangeContext";

import { getData as getDataImport } from "../../../utils/getData";
import { putData as putDataImport } from "../../../utils/sendData";

jest.mock("../../../utils/getData");
jest.mock("../../../utils/sendData");
jest.mock("../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token", username: "test-user" }),
}));
jest.mock("../../../hooks/useFreshRef", () => ({
  useFreshRef: (value: unknown) => ({ current: value }),
}));
jest.mock("../../../stores/PermissionsContext", () => ({
  usePermissions: () => ({ permissionsCheck: () => true }),
}));
jest.mock("../stores/socket", () => ({
  socket: {
    io: { opts: {} },
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

const mockGetData = getDataImport as jest.MockedFunction<typeof getDataImport>;
const mockPutData = putDataImport as jest.MockedFunction<typeof putDataImport>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetData.mockImplementation((url: string) => {
    if (url.includes("/device_synchistory")) {
      return Promise.resolve({ data: { hostnames: {} } });
    }
    if (url.includes("/devices")) {
      return Promise.resolve({ data: { devices: [] } });
    }
    // Repository status lookups (settings/templates)
    return Promise.resolve({ data: "repo_name_mock" });
  });
  mockPutData.mockResolvedValue(true);
});

function renderStep1(
  props: Partial<
    Pick<
      Parameters<typeof ConfigChangeStep1>[0],
      "onDryRunReady" | "setRepoWorking"
    >
  > = {},
) {
  const router = createMemoryRouter(
    [
      {
        path: "/config-change",
        element: (
          <ConfigChangeProvider>
            <ConfigChangeStep1
              onDryRunReady={props.onDryRunReady ?? jest.fn()}
              setRepoWorking={props.setRepoWorking ?? jest.fn()}
            />
          </ConfigChangeProvider>
        ),
      },
    ],
    { initialEntries: ["/config-change"] },
  );
  return render(<RouterProvider router={router} />);
}

test("loads and displays 3 enabled buttons", async () => {
  renderStep1();

  const buttons = await screen.findAllByRole("button");

  // 2 action buttons + the Task accordion's expand/collapse toggle.
  expect(buttons.length).toBe(3);
  buttons.forEach((button) => expect(button).toBeEnabled());
});

test("click refresh settings success", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  renderStep1();

  const refreshSettingsButton = await screen.findByRole("button", {
    name: "Refresh settings",
  });
  await userEvent.click(refreshSettingsButton);

  expect(
    await screen.findByText("✓ Refreshed successfully"),
  ).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
});

test("click refresh settings not success", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "not_success",
    message: "A message recieved",
  });
  renderStep1();

  const refreshSettingsButton = await screen.findByRole("button", {
    name: "Refresh settings",
  });
  await userEvent.click(refreshSettingsButton);

  expect(await screen.findByText("✗ Refresh failed")).toBeInTheDocument();
  expect(screen.getByText("A message recieved")).toBeInTheDocument();
});

test("click refresh settings runs dry run automatically by default", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  const onDryRunReady = jest.fn();
  renderStep1({ onDryRunReady });

  const refreshSettingsButton = await screen.findByRole("button", {
    name: "Refresh settings",
  });
  await userEvent.click(refreshSettingsButton);

  expect(
    await screen.findByText("✓ Refreshed successfully"),
  ).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
  expect(onDryRunReady).toHaveBeenCalledTimes(1);
});

test("unchecking auto dry run prevents dry run after refresh settings", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  const onDryRunReady = jest.fn();
  renderStep1({ onDryRunReady });

  const autoDryRunCheckbox = await screen.findByRole("checkbox", {
    name: "Auto dry run after refresh settings",
  });
  expect(autoDryRunCheckbox).toBeChecked();
  await userEvent.click(autoDryRunCheckbox);
  expect(autoDryRunCheckbox).not.toBeChecked();

  const refreshSettingsButton = screen.getByRole("button", {
    name: "Refresh settings",
  });
  await userEvent.click(refreshSettingsButton);

  expect(
    await screen.findByText("✓ Refreshed successfully"),
  ).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
  expect(onDryRunReady).not.toHaveBeenCalled();
});

test("click refresh templates", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  renderStep1();

  const refreshTemplatesButton = await screen.findByRole("button", {
    name: "Refresh templates",
  });
  await userEvent.click(refreshTemplatesButton);

  expect(
    await screen.findByText("✓ Refreshed successfully"),
  ).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
});
