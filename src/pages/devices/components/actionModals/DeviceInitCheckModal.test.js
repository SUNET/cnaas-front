import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DeviceInitCheckModal } from "./DeviceInitCheckModal";
import { initCheckDevice as mockInitCheckDevice } from "../../api/deviceListApi";

jest.mock("../../api/deviceListApi");
jest.mock("../../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const mockSubmitInit = jest.fn();

function renderComponent(props = {}) {
  const defaultProps = {
    disabled: false,
    submitInit: mockSubmitInit,
    deviceId: 10,
    hostname: "test-switch",
    deviceType: "ACCESS",
  };
  return render(<DeviceInitCheckModal {...defaultProps} {...props} />);
}

const compatibleResponse = {
  data: {
    compatible: true,
    linknets_compatible: true,
    neighbors_compatible: true,
    linknets: [{ name: "linknet1" }],
    neighbors: [{ name: "neighbor1" }],
  },
};

const incompatibleResponse = {
  data: {
    compatible: false,
    linknets_compatible: false,
    neighbors_compatible: true,
    linknets: [],
    neighbors: [{ name: "neighbor1" }],
  },
};

test("renders trigger button with provided text", () => {
  renderComponent();

  const triggerButton = screen.getByRole("button", {
    name: /initialize\.\.\./i,
  });
  expect(triggerButton).toBeInTheDocument();
  expect(triggerButton).toBeEnabled();
});

test("trigger button is disabled when disabled prop is true", () => {
  renderComponent({ disabled: true });

  expect(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  ).toBeDisabled();
});

test("opens modal and calls initcheck API on trigger click", async () => {
  mockInitCheckDevice.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  expect(screen.getByText(/init compatability check/i)).toBeInTheDocument();

  expect(mockInitCheckDevice).toHaveBeenCalledWith(
    10,
    { hostname: "test-switch", device_type: "ACCESS" },
    "test-token",
  );
});

test("includes MLAG peer data in API call when provided", async () => {
  mockInitCheckDevice.mockResolvedValue(compatibleResponse);
  renderComponent({ mlagPeerHostname: "peer-switch", mlagPeerId: 11 });

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  expect(mockInitCheckDevice).toHaveBeenCalledWith(
    10,
    {
      hostname: "test-switch",
      device_type: "ACCESS",
      mlag_peer_hostname: "peer-switch",
      mlag_peer_id: 11,
    },
    "test-token",
  );
});

test("enables start initialization button when check is compatible", async () => {
  mockInitCheckDevice.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  const startButton = await screen.findByRole("button", {
    name: /start initialization/i,
  });
  expect(startButton).toBeEnabled();
});

test("disables start initialization button when check is incompatible", async () => {
  mockInitCheckDevice.mockResolvedValue(incompatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  const startButton = await screen.findByRole("button", {
    name: /start initialization/i,
  });
  expect(startButton).toBeDisabled();
});

test("shows linknets and neighbors counts after successful check", async () => {
  mockInitCheckDevice.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  await waitFor(() => {
    expect(screen.getByText(/linknets: 1/i)).toBeInTheDocument();
  });
  expect(screen.getByText(/compatible neighbors: 1/i)).toBeInTheDocument();
});

test("clicking start initialization calls submitInit and closes modal", async () => {
  mockInitCheckDevice.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  const startButton = await screen.findByRole("button", {
    name: /start initialization/i,
  });
  await userEvent.click(startButton);

  expect(mockSubmitInit).toHaveBeenCalledTimes(1);
});

test("clicking cancel closes modal without calling submitInit", async () => {
  mockInitCheckDevice.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  await screen.findByRole("button", { name: /start initialization/i });

  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

  expect(mockSubmitInit).not.toHaveBeenCalled();
});

test("displays error output when initcheck API fails", async () => {
  mockInitCheckDevice.mockRejectedValue(new Error("Connection refused"));
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  await waitFor(() => {
    expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
  });
});
