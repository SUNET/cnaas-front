import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DeviceStateModal } from "./DeviceStateModal";
import { updateDevice as mockUpdateDevice } from "../../api/deviceListApi";

jest.mock("../../api/deviceListApi");
jest.mock("../../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const mockCloseAction = jest.fn();
const mockOnStateChange = jest.fn();

function renderComponent(props = {}) {
  const defaultProps = {
    isOpen: true,
    closeAction: mockCloseAction,
    deviceId: 42,
    hostname: "test-switch",
    newState: "UNMANAGED",
    onStateChange: mockOnStateChange,
  };
  return render(<DeviceStateModal {...defaultProps} {...props} />);
}

test("renders confirmation message with hostname and new state", () => {
  renderComponent();

  expect(screen.getByText(/device state needs to change/i)).toBeInTheDocument();
  expect(
    screen.getByText(/change the state of device test-switch to unmanaged/i),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /change state/i }),
  ).toBeInTheDocument();
});

test("calls API and closes modal on successful state change", async () => {
  mockUpdateDevice.mockResolvedValue({ status: "success" });
  renderComponent();

  await userEvent.click(screen.getByRole("button", { name: /change state/i }));

  await waitFor(() => {
    expect(mockUpdateDevice).toHaveBeenCalledWith(
      42,
      { state: "UNMANAGED", synchronized: false },
      "test-token",
    );
  });
  expect(mockCloseAction).toHaveBeenCalled();
  expect(mockOnStateChange).toHaveBeenCalled();
});

test("shows error and stays open when API returns non-success", async () => {
  mockUpdateDevice.mockRejectedValue({
    status: 400,
    statusText: "Bad Request",
    message: "Invalid state",
  });
  renderComponent();

  await userEvent.click(screen.getByRole("button", { name: /change state/i }));

  await waitFor(() => {
    expect(screen.getByText(/invalid state/i)).toBeInTheDocument();
  });
  expect(mockCloseAction).not.toHaveBeenCalled();
  expect(mockOnStateChange).toHaveBeenCalled();
});

test("shows error and stays open when API throws", async () => {
  mockUpdateDevice.mockRejectedValue(new Error("Network error"));
  renderComponent();

  await userEvent.click(screen.getByRole("button", { name: /change state/i }));

  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
  expect(mockCloseAction).not.toHaveBeenCalled();
  expect(mockOnStateChange).toHaveBeenCalled();
});

test("cancel closes modal without calling API", async () => {
  renderComponent();

  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

  expect(mockUpdateDevice).not.toHaveBeenCalled();
  expect(mockCloseAction).toHaveBeenCalled();
  expect(mockOnStateChange).not.toHaveBeenCalled();
});
