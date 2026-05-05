import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { HostnameModal } from "./HostnameModal";
import { updateDevice as mockUpdateDevice } from "../../api/deviceListApi";

jest.mock("../../api/deviceListApi");
jest.mock("../../../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const mockCloseAction = jest.fn();
const mockOnSuccess = jest.fn();

function renderComponent(props = {}) {
  const defaultProps = {
    closeAction: mockCloseAction,
    deviceId: 42,
    hostname: "old-switch",
    isOpen: true,
    onSuccess: mockOnSuccess,
  };
  return render(<HostnameModal {...defaultProps} {...props} />);
}

test("successfully changes hostname and navigates to config-change", async () => {
  mockUpdateDevice.mockResolvedValue({ status: "success" });
  renderComponent();

  expect(
    screen.getByText(/change hostname for old-switch/i),
  ).toBeInTheDocument();

  const submitButton = screen.getByRole("button", { name: /change hostname/i });
  expect(submitButton).toBeDisabled();
  expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled();

  const hostnameInput = screen.getByPlaceholderText(/new hostname/i);
  await userEvent.type(hostnameInput, "new-switch");
  expect(submitButton).toBeEnabled();

  await userEvent.click(submitButton);

  expect(mockUpdateDevice).toHaveBeenCalledWith(
    42,
    { hostname: "new-switch" },
    "test-token",
  );

  await waitFor(() => {
    expect(screen.getByText(/hostname changed/i)).toBeInTheDocument();
  });
  expect(mockOnSuccess).toHaveBeenCalledWith("old-switch", "new-switch");

  const syncButton = screen.getByRole("button", { name: /sync devices/i });
  expect(syncButton).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /cancel/i }),
  ).not.toBeInTheDocument();

  await userEvent.click(syncButton);
  expect(globalThis.mockNavigate).toHaveBeenCalledWith(
    "/config-change?scrollTo=dry_run",
  );
});

test("submit button remains disabled when typing the same hostname", async () => {
  renderComponent({ hostname: "current-switch" });

  const submitButton = screen.getByRole("button", { name: /change hostname/i });
  const hostnameInput = screen.getByPlaceholderText(/new hostname/i);

  expect(submitButton).toBeDisabled();
  await userEvent.type(hostnameInput, "current-switch");
  expect(submitButton).toBeDisabled();
  expect(mockUpdateDevice).not.toHaveBeenCalled();
});

test("shows error message when backend request fails", async () => {
  mockUpdateDevice.mockResolvedValue({
    status: "error",
    error: "Hostname already exists",
  });
  renderComponent();

  const submitButton = screen.getByRole("button", { name: /change hostname/i });
  const hostnameInput = screen.getByPlaceholderText(/new hostname/i);

  await userEvent.type(hostnameInput, "new-switch");
  await userEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/hostname already exists/i)).toBeInTheDocument();
  });
  expect(document.querySelector(".red.delete.icon")).toBeInTheDocument();
  expect(screen.queryByText(/hostname changed/i)).not.toBeInTheDocument();
  expect(mockOnSuccess).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /change hostname/i }),
  ).toBeInTheDocument();
});

test("shows error message when network request throws exception", async () => {
  mockUpdateDevice.mockRejectedValue(new Error("Network connection failed"));
  renderComponent();

  const submitButton = screen.getByRole("button", { name: /change hostname/i });
  const hostnameInput = screen.getByPlaceholderText(/new hostname/i);

  await userEvent.type(hostnameInput, "new-switch");
  await userEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
  });
  expect(document.querySelector(".red.delete.icon")).toBeInTheDocument();
  expect(mockOnSuccess).not.toHaveBeenCalled();
});
