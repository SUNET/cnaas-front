import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router";

import { ImportInterfaceModal } from "./ImportInterfaceModal";
import { putData as mockPutData } from "../../utils/sendData";

jest.mock("../../utils/sendData");
jest.mock("../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

// JSDOM's File doesn't have .text(), polyfill it for tests
if (!File.prototype.text) {
  File.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

function renderComponent(props = {}) {
  const defaultProps = {
    hostname: "test-switch",
    open: true,
    onClose: jest.fn(),
    getInterfaceData: jest.fn(),
  };
  const merged = { ...defaultProps, ...props };
  return {
    props: merged,
    ...render(
      <RouterProvider
        router={createMemoryRouter(
          [{ path: "/", element: <ImportInterfaceModal {...merged} /> }],
          { initialEntries: ["/"] },
        )}
      />,
    ),
  };
}

test("navigates to config-change with hostname on save and dry run", async () => {
  mockPutData.mockResolvedValue({ status: "success" });

  renderComponent();

  // Upload a valid JSON file
  const validJson = JSON.stringify({
    interfaces: { Ethernet1: { configtype: "ACCESS_UNTAGGED" } },
  });
  const file = new File([validJson], "interfaces.json", {
    type: "application/json",
  });

  const fileInput = document.getElementById("import-file");
  await userEvent.upload(fileInput, file);

  // Wait for "Save and dry run" button to become enabled (proves file was parsed)
  const dryRunButton = screen.getByRole("button", {
    name: /save and dry run/i,
  });
  await waitFor(() => {
    expect(dryRunButton).not.toBeDisabled();
  });

  await userEvent.click(dryRunButton);

  await waitFor(() => {
    expect(globalThis.mockNavigate).toHaveBeenCalledWith(
      "/config-change?hostname=test-switch&scrollTo=refreshrepo",
    );
  });
});

test("calls onClose and getInterfaceData on save and edit", async () => {
  mockPutData.mockResolvedValue({ status: "success" });

  const { props } = renderComponent();

  // Upload a valid JSON file
  const validJson = JSON.stringify({
    interfaces: { Ethernet1: { configtype: "ACCESS_UNTAGGED" } },
  });
  const file = new File([validJson], "interfaces.json", {
    type: "application/json",
  });

  const fileInput = document.getElementById("import-file");
  await userEvent.upload(fileInput, file);

  // Wait for the parsed JSON to appear
  await waitFor(() => {
    expect(screen.getByText(/"interfaces"/)).toBeInTheDocument();
  });

  const saveEditButton = screen.getByRole("button", {
    name: /save and edit/i,
  });
  expect(saveEditButton).toBeEnabled();

  await userEvent.click(saveEditButton);

  await waitFor(() => {
    expect(mockPutData).toHaveBeenCalledWith(
      expect.stringContaining("/device/test-switch/interfaces"),
      "test-token",
      expect.objectContaining({ interfaces: expect.any(Object) }),
    );
  });

  await waitFor(() => {
    expect(props.getInterfaceData).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });
});

test("shows error for invalid JSON file", async () => {
  renderComponent();

  const file = new File(["not valid json"], "bad.json", {
    type: "application/json",
  });

  const fileInput = document.getElementById("import-file");
  await userEvent.upload(fileInput, file);

  await waitFor(() => {
    expect(screen.getByText(/Error parsing JSON/)).toBeInTheDocument();
  });

  // Buttons should be disabled
  const dryRunButton = screen.getByRole("button", {
    name: /save and dry run/i,
  });
  expect(dryRunButton).toBeDisabled();
});
