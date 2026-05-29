import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DashboardInterfaceStatus } from "./DashboardInterfaceStatus";
import { fetchNetboxDashboardInterfaces } from "../../../api/netboxApi";
import { fetchInterfaceStatus } from "../../../api/deviceApi";

jest.mock("../../../api/netboxApi");
jest.mock("../../../api/deviceApi");
jest.mock("../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));
jest.mock("../../../components/GraphiteInterface", () => ({
  GraphiteInterface: () => <div>graphite-mock</div>,
}));

const mockFetchNetboxDashboardInterfaces = jest.mocked(
  fetchNetboxDashboardInterfaces,
);
const mockFetchInterfaceStatus = jest.mocked(fetchInterfaceStatus);

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders an interface row with operational status from the device", async () => {
  mockFetchNetboxDashboardInterfaces.mockResolvedValue([
    {
      id: 100,
      name: "Ethernet1",
      description: "uplink",
      speed: 10000,
      device: { id: 1, name: "sw-01" },
      tags: [{ name: "cnaas_dashboard" }],
    },
  ]);
  mockFetchInterfaceStatus.mockResolvedValue({
    Ethernet1: { is_up: true, description: "uplink", speed: 10000 },
  });

  render(<DashboardInterfaceStatus />);

  await waitFor(() => {
    expect(
      screen.getByRole("link", { name: /sw-01: Ethernet1 - Up/ }),
    ).toBeInTheDocument();
  });
});

test("renders no interfaces when NetBox returns none", async () => {
  mockFetchNetboxDashboardInterfaces.mockResolvedValue([]);

  render(<DashboardInterfaceStatus />);

  await waitFor(() => {
    expect(mockFetchNetboxDashboardInterfaces).toHaveBeenCalled();
  });
  expect(screen.queryByText(/Interfaces/)).not.toBeInTheDocument();
});
