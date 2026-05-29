import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DashboardNetboxTenant } from "./DashboardNetboxTenant";
import {
  fetchNetboxTenant,
  fetchNetboxTenantContacts,
} from "../../../api/netboxApi";

jest.mock("../../../api/netboxApi");
jest.mock("../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

const mockFetchNetboxTenant = jest.mocked(fetchNetboxTenant);
const mockFetchNetboxTenantContacts = jest.mocked(fetchNetboxTenantContacts);

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    NETBOX_API_URL: "https://netbox.example/",
    NETBOX_TENANT_ID: "7",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

test("renders tenant details and contacts", async () => {
  mockFetchNetboxTenant.mockResolvedValue({
    name: "Acme",
    description: "Acme Corp",
    group: { name: "Gold", description: "Gold tier" },
    site_count: 2,
    device_count: 5,
    vrf_count: 1,
    prefix_count: 8,
    vlan_count: 4,
  });
  mockFetchNetboxTenantContacts.mockResolvedValue([
    {
      role: { name: "Owner" },
      contact: { name: "Bob", email: "bob@acme.test", phone: null },
      priority: "primary",
    },
  ]);

  render(<DashboardNetboxTenant />);

  await waitFor(() => {
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
  });
  expect(screen.getByText(/Owner:/)).toBeInTheDocument();
  expect(screen.getByText(/Bob/)).toBeInTheDocument();
});

test("renders nothing when NetBox env is not configured", () => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NETBOX_API_URL;
  delete process.env.NETBOX_TENANT_ID;

  const { container } = render(<DashboardNetboxTenant />);

  expect(container).toBeEmptyDOMElement();
});

test("shows fallback instead of staying on loading when the fetch fails", async () => {
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});
  mockFetchNetboxTenant.mockRejectedValue(new Error("NetworkError"));
  mockFetchNetboxTenantContacts.mockResolvedValue([]);

  render(<DashboardNetboxTenant />);

  await waitFor(() => {
    expect(screen.getByText(/No tenant data found\./)).toBeInTheDocument();
  });
  expect(screen.queryByText(/Loading tenant data/)).not.toBeInTheDocument();

  consoleErrorSpy.mockRestore();
});
