import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router";

import { ConfigChange } from "./ConfigChange";
import { getData as mockGetData } from "../../utils/getData";

jest.mock("../../utils/getData");
jest.mock("../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));
jest.mock("../../hooks/useFreshRef.js", () => ({
  useFreshRef: (value) => ({ current: value }),
}));
jest.mock("../../contexts/PermissionsContext", () => ({
  usePermissions: () => ({ permissionsCheck: () => true }),
}));

const mockSocketOn = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketOff = jest.fn();
jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
    off: mockSocketOff,
  })),
}));

// Mock heavy child components to isolate query param behavior
jest.mock("./ConfigChangeStep1", () => {
  return function MockConfigChangeStep1() {
    return <div data-testid="config-change-step1">Step 1</div>;
  };
});

jest.mock("./DryRun/DryRun", () => ({
  DryRun: function MockDryRun() {
    return <div data-testid="dry-run">Dry Run</div>;
  },
}));

jest.mock("./VerifyDiff/VerifyDiff", () => {
  return function MockVerifyDiff() {
    return <div data-testid="verify-diff">Verify Diff</div>;
  };
});

jest.mock("./ConfigChangeStep4", () => {
  return function MockConfigChangeStep4() {
    return <div data-testid="config-change-step4">Step 4</div>;
  };
});

beforeEach(() => {
  jest.clearAllMocks();

  mockGetData.mockImplementation((url) => {
    if (url.includes("/devices")) {
      return Promise.resolve({
        data: {
          devices: [
            { hostname: "test-switch", synchronized: false, state: "MANAGED" },
          ],
        },
      });
    }
    if (url.includes("/device_synchistory")) {
      return Promise.resolve({ data: { hostnames: {} } });
    }
    return Promise.resolve({ data: {} });
  });
});

function renderComponent(search = "") {
  const router = createMemoryRouter(
    [{ path: "/config-change", element: <ConfigChange /> }],
    { initialEntries: [`/config-change${search}`] },
  );
  return render(<RouterProvider router={router} />);
}

test("targets specific hostname from query params", async () => {
  renderComponent("?hostname=test-switch");

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: /Hostname: test-switch/ }),
    ).toBeInTheDocument();
  });
});

test("targets all unsynchronized devices when no query params", async () => {
  renderComponent("");

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: /All unsynchronized devices/ }),
    ).toBeInTheDocument();
  });
});

test("targets group from query params", async () => {
  mockGetData.mockImplementation((url) => {
    if (url.includes("/devices")) {
      return Promise.resolve({
        data: {
          devices: [
            { hostname: "switch-1", synchronized: false, state: "MANAGED" },
          ],
        },
      });
    }
    if (url.includes("/groups/access-switches")) {
      return Promise.resolve({
        data: {
          groups: { "access-switches": ["switch-1"] },
        },
      });
    }
    if (url.includes("/device_synchistory")) {
      return Promise.resolve({ data: { hostnames: {} } });
    }
    return Promise.resolve({ data: {} });
  });

  renderComponent("?group=access-switches");

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: /Group: access-switches/ }),
    ).toBeInTheDocument();
  });
});

test("sends hostname filter in device list API call", async () => {
  renderComponent("?hostname=test-switch");

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: /Hostname: test-switch/ }),
    ).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(mockGetData).toHaveBeenCalledWith(
      expect.stringContaining("filter[hostname]=test-switch"),
      "test-token",
    );
  });
});
