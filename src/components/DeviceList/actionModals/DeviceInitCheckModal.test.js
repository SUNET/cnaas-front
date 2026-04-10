import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DeviceInitCheckModal } from "./DeviceInitCheckModal";
import { postData as mockPostData } from "../../../utils/sendData";

jest.mock("../../../utils/sendData");
jest.mock("../../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

process.env.API_URL = "https://api.test.com";

beforeEach(() => {
  jest.clearAllMocks();
});

const mockSubmitInit = jest.fn();

function renderComponent(props = {}) {
  const defaultProps = {
    submitDisabled: false,
    submitText: "Initialize...",
    submitIcon: "window restore outline",
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

test("trigger button is disabled when submitDisabled is true", () => {
  renderComponent({ submitDisabled: true });

  expect(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  ).toBeDisabled();
});

test("opens modal and calls initcheck API on trigger click", async () => {
  mockPostData.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  expect(screen.getByText(/init compatability check/i)).toBeInTheDocument();

  expect(mockPostData).toHaveBeenCalledWith(
    "https://api.test.com/api/v1.0/device_initcheck/10",
    "test-token",
    { hostname: "test-switch", device_type: "ACCESS" },
  );
});

test("includes MLAG peer data in API call when provided", async () => {
  mockPostData.mockResolvedValue(compatibleResponse);
  renderComponent({ mlagPeerHostname: "peer-switch", mlagPeerId: 11 });

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  expect(mockPostData).toHaveBeenCalledWith(
    "https://api.test.com/api/v1.0/device_initcheck/10",
    "test-token",
    {
      hostname: "test-switch",
      device_type: "ACCESS",
      mlag_peer_hostname: "peer-switch",
      mlag_peer_id: 11,
    },
  );
});

test("enables start initialization button when check is compatible", async () => {
  mockPostData.mockResolvedValue(compatibleResponse);
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
  mockPostData.mockResolvedValue(incompatibleResponse);
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
  mockPostData.mockResolvedValue(compatibleResponse);
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
  mockPostData.mockResolvedValue(compatibleResponse);
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
  mockPostData.mockResolvedValue(compatibleResponse);
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  await screen.findByRole("button", { name: /start initialization/i });

  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

  expect(mockSubmitInit).not.toHaveBeenCalled();
});

test("displays error output when initcheck API fails", async () => {
  mockPostData.mockRejectedValue(new Error("Connection refused"));
  renderComponent();

  await userEvent.click(
    screen.getByRole("button", { name: /initialize\.\.\./i }),
  );

  await waitFor(() => {
    expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
  });
});
