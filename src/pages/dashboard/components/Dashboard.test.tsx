import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { Dashboard } from "./Dashboard";
import {
  fetchRepoStatus,
  fetchDeviceCount,
  fetchSystemVersion,
} from "../api/dashboardApi";

jest.mock("../api/dashboardApi");
jest.mock("../../../components/DashboardLinkgrid", () => ({
  DashboardLinkgrid: () => <div>linkgrid-mock</div>,
}));
jest.mock("../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

const mockFetchRepoStatus = jest.mocked(fetchRepoStatus);
const mockFetchDeviceCount = jest.mocked(fetchDeviceCount);
const mockFetchSystemVersion = jest.mocked(fetchSystemVersion);

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchRepoStatus.mockResolvedValue(
    "Commit abc123 main by Alice at 2026-01-01 10:00:00",
  );
  mockFetchDeviceCount.mockImplementation((filter) =>
    Promise.resolve(filter.includes("synchronized") ? 3 : 42),
  );
  mockFetchSystemVersion.mockResolvedValue({
    version: "1.9.0",
    git_version: "abc123",
  });
});

test("renders managed and unsynchronized device counts", async () => {
  render(<Dashboard />);

  await waitFor(() => {
    expect(screen.getByRole("link", { name: "42" })).toBeInTheDocument();
  });
  expect(screen.getByRole("link", { name: "3" })).toBeInTheDocument();
});

test("renders parsed settings and templates repo info", async () => {
  render(<Dashboard />);

  await waitFor(() => {
    expect(screen.getByText(/Settings \(/)).toBeInTheDocument();
  });
  expect(screen.getByText(/Templates \(/)).toBeInTheDocument();
  expect(screen.getAllByText(/by Alice/)).toHaveLength(2);
});

test("renders the CNaaS-NMS version link", async () => {
  render(<Dashboard />);

  await waitFor(() => {
    expect(
      screen.getByRole("link", { name: /CNaaS-NMS version: 1\.9\.0/ }),
    ).toBeInTheDocument();
  });
});
