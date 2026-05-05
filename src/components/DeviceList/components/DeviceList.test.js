import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DeviceListPage } from "./DeviceListPage";

import {
  getData as mockGetData,
  getResponse as mockGetResponse,
} from "../../../utils/getData";
import { deleteData as mockDeleteData } from "../../../utils/sendData";

jest.mock("../../../utils/getData");
jest.mock("../../../utils/sendData");
jest.mock("../../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));
jest.mock("../../../contexts/PermissionsContext", () => ({
  usePermissions: () => ({ permissionsCheck: () => true }),
}));
jest.mock("../../../hooks/useFreshRef", () => ({
  useFreshRef: (value) => ({ current: value }),
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
jest.mock("../../../services/netbox", () => ({
  fetchNetboxDevice: jest.fn().mockResolvedValue(null),
  fetchNetboxModel: jest.fn().mockResolvedValue(null),
}));

const FIXTURE_DEVICES = [
  {
    id: 55,
    hostname: "mac-B8C253EA6871",
    device_type: "UNKNOWN",
    state: "DISCOVERED",
    synchronized: false,
  },
  {
    id: 91,
    hostname: "webuitest3",
    device_type: "UNKNOWN",
    state: "DHCP_BOOT",
    synchronized: false,
  },
  {
    id: 152,
    hostname: "a3",
    device_type: "ACCESS",
    state: "MANAGED",
    synchronized: true,
  },
];

function devicesPageResponse(devices, totalCount = devices.length) {
  return {
    headers: {
      get: (name) => (name === "X-Total-Count" ? String(totalCount) : null),
    },
    json: async () => ({ data: { devices } }),
  };
}

function MockDeviceList({ initialEntry = "/devices" } = {}) {
  const router = createMemoryRouter(
    [{ path: "/devices", element: <DeviceListPage /> }],
    { initialEntries: [initialEntry] },
  );
  return <RouterProvider router={router} />;
}

beforeEach(() => {
  mockGetData.mockReset();
  mockGetResponse.mockReset();
  mockDeleteData.mockReset();

  // /api/v1.0/mgmtdomains and discovered-devices fall through getData
  mockGetData.mockResolvedValue({
    data: { devices: [], mgmtdomains: [] },
  });
  // /api/v1.0/devices?... goes through getResponse
  mockGetResponse.mockResolvedValue(devicesPageResponse(FIXTURE_DEVICES));
  mockDeleteData.mockResolvedValue({ data: "deleted" });

  jest.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("loads and displays", async () => {
  render(<MockDeviceList />);
  const buttons = await screen.findAllByRole("button");
  buttons.forEach((button) => expect(button).toBeEnabled());
});

describe("device table rendering", () => {
  test("renders a row for each device with hostname and state", async () => {
    render(<MockDeviceList />);

    // Each hostname/state appears once in the visible table cell and once
    // again inside the (hidden) expanded DeviceInfoTable, so use *AllBy.
    expect(await screen.findAllByText("mac-B8C253EA6871")).not.toHaveLength(0);
    expect(screen.getAllByText("webuitest3")).not.toHaveLength(0);
    expect(screen.getAllByText("a3")).not.toHaveLength(0);
    expect(screen.getAllByText("DISCOVERED")).not.toHaveLength(0);
    expect(screen.getAllByText("DHCP_BOOT")).not.toHaveLength(0);
    expect(screen.getAllByText("MANAGED")).not.toHaveLength(0);
  });
});

describe("sorting", () => {
  test("clicking a header column sends descending sort, then ascending on second click", async () => {
    const user = userEvent.setup();
    render(<MockDeviceList />);

    await screen.findAllByText("mac-B8C253EA6871");
    mockGetResponse.mockClear();

    const hostnameHeader = screen.getByRole("columnheader", {
      name: "Hostname",
    });
    await user.click(hostnameHeader);
    await waitFor(() => expect(mockGetResponse).toHaveBeenCalled());
    expect(mockGetResponse.mock.calls[0][0]).toContain("sort=-hostname");

    mockGetResponse.mockClear();
    await user.click(hostnameHeader);
    await waitFor(() => expect(mockGetResponse).toHaveBeenCalled());
    expect(mockGetResponse.mock.calls[0][0]).toMatch(/sort=hostname(?!-)/);
  });
});

describe("row expansion", () => {
  function findVisible(elements) {
    return elements.find((el) => el.closest("tr:not([hidden])"));
  }

  async function findVisibleHostnameRow(hostname) {
    const cells = await screen.findAllByText(hostname);
    const cell = findVisible(cells);
    expect(cell).toBeDefined();
    return cell.closest("tr");
  }

  test("clicking a row reveals the Actions dropdown", async () => {
    const user = userEvent.setup();
    render(<MockDeviceList />);
    const row = await findVisibleHostnameRow("a3");

    // Before click: no visible Actions dropdown for this row.
    const actionsBefore = screen.queryAllByText("Actions");
    expect(findVisible(actionsBefore)).toBeUndefined();

    await user.click(row);

    await waitFor(() => {
      const actionsAfter = screen.queryAllByText("Actions");
      expect(findVisible(actionsAfter)).toBeDefined();
    });
  });

  test("clicking the same row again hides the Actions dropdown", async () => {
    const user = userEvent.setup();
    render(<MockDeviceList />);
    const row = await findVisibleHostnameRow("a3");

    await user.click(row);
    await waitFor(() =>
      expect(findVisible(screen.queryAllByText("Actions"))).toBeDefined(),
    );

    await user.click(row);
    await waitFor(() =>
      expect(findVisible(screen.queryAllByText("Actions"))).toBeUndefined(),
    );
  });
});

describe("action menu by device state and type", () => {
  async function expandRowAndOpenMenu(user, hostname) {
    const cells = await screen.findAllByText(hostname);
    const cell = cells.find((c) => c.closest("tr:not([hidden])"));
    const row = cell.closest("tr");
    await user.click(row);
    let trigger;
    await waitFor(() => {
      trigger = screen
        .getAllByText("Actions")
        .find((el) => el.closest("tr:not([hidden])"));
      expect(trigger).toBeDefined();
    });
    await user.click(trigger);
    return within(trigger.closest(".ui.dropdown"));
  }

  test("MANAGED ACCESS device shows full action set", async () => {
    const user = userEvent.setup();
    render(<MockDeviceList />);

    const menu = await expandRowAndOpenMenu(user, "a3");

    expect(menu.getByText("Sync device...")).toBeInTheDocument();
    expect(menu.getByText("Firmware upgrade...")).toBeInTheDocument();
    expect(menu.getByText("Make unmanaged")).toBeInTheDocument();
    expect(menu.getByText("Replace device...")).toBeInTheDocument();
    expect(menu.getByText("Configure ports")).toBeInTheDocument();
    expect(menu.getByText("Delete device...")).toBeInTheDocument();
  });

  test("DHCP_BOOT device shows only delete + change hostname", async () => {
    const user = userEvent.setup();
    render(<MockDeviceList />);

    const menu = await expandRowAndOpenMenu(user, "webuitest3");

    expect(menu.getByText("Delete device...")).toBeInTheDocument();
    expect(menu.getByText("Change hostname...")).toBeInTheDocument();
    expect(menu.queryByText("Sync device...")).toBeNull();
    expect(menu.queryByText("Replace device...")).toBeNull();
    expect(menu.queryByText("Configure ports")).toBeNull();
  });

  test("DISCOVERED device shows only delete", async () => {
    const user = userEvent.setup();
    render(<MockDeviceList />);

    const menu = await expandRowAndOpenMenu(user, "mac-B8C253EA6871");

    expect(menu.getByText("Delete device...")).toBeInTheDocument();
    expect(menu.queryByText("Change hostname...")).toBeNull();
    expect(menu.queryByText("Sync device...")).toBeNull();
  });
});

describe("pagination", () => {
  test("X-Total-Count drives total page count and clicking page 2 re-fetches with page=2", async () => {
    mockGetResponse.mockResolvedValue(devicesPageResponse(FIXTURE_DEVICES, 60));
    const user = userEvent.setup();
    render(<MockDeviceList />);

    await screen.findAllByText("a3");
    // 60 devices / 20 per page = 3 pages
    expect(await screen.findByText("3")).toBeInTheDocument();

    mockGetResponse.mockClear();
    await user.click(screen.getByText("2"));

    await waitFor(() => expect(mockGetResponse).toHaveBeenCalled());
    expect(mockGetResponse.mock.calls[0][0]).toContain("page=2");
  });
});
