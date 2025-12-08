import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { InterfaceConfig } from "./InterfaceConfig";
import { getData } from "../../utils/getData";
import { putData, postData } from "../../utils/sendData";

// Mock dependencies
jest.mock("../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

jest.mock("../../utils/getData");
jest.mock("../../utils/sendData");
jest.mock("socket.io-client", () => {
  return jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock environment variables
process.env.API_URL = "https://api.test.com";
process.env.NETBOX_API_URL = undefined;

const mockToken = "test-token";

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
    if (key === "token") return mockToken;
    if (key === "interfaceConfig") return null;
    return null;
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
});

afterAll(() => {
  globalThis.Storage.prototype.getItem.mockRestore();
  globalThis.Storage.prototype.setItem.mockRestore();
});

function defaultGetDataMock(url) {
  if (url.includes("/device/test-switch/interfaces")) {
    return Promise.resolve(mockInterfaceDataAccess());
  }
  if (url.includes("/device/test-switch/interface_status")) {
    return Promise.resolve(mockInterfaceStatusData());
  }
  if (url.includes("/device/test-switch/lldp")) {
    return Promise.resolve(mockLldpData());
  }
  if (url.includes("/device/test-switch") && !url.includes("/interfaces")) {
    return Promise.resolve(mockDeviceData("ACCESS"));
  }
  if (url.includes("/settings")) {
    return Promise.resolve(mockSettingsData());
  }
  return Promise.resolve({ data: {} });
}

async function waitForEthernet1() {
  await waitFor(
    () => {
      expect(screen.getByText("Ethernet1")).toBeInTheDocument();
    },
    { timeout: 3000 },
  );
}
// Mock data helpers
const mockDeviceData = (deviceType = "ACCESS", synchronized = true) => ({
  data: {
    devices: [
      {
        id: 1,
        hostname: "test-switch",
        device_type: deviceType,
        synchronized,
        confhash: "abc123",
      },
    ],
  },
});

const mockSettingsData = () => ({
  data: {
    settings: {
      vxlans: {
        vlan100: { vlan_name: "DATA", vlan_id: 100 },
        vlan200: { vlan_name: "VOICE", vlan_id: 200 },
      },
      interface_tag_options: {
        uplink: { description: "Uplink port" },
      },
    },
  },
});

const mockInterfaceDataAccess = () => ({
  data: {
    interfaces: [
      {
        name: "Ethernet1",
        configtype: "ACCESS_UNTAGGED",
        indexnum: 1,
        data: {
          description: "Test port",
          untagged_vlan: "DATA",
          enabled: true,
          tags: ["uplink"],
        },
      },
      {
        name: "Ethernet2",
        configtype: "ACCESS_TAGGED",
        indexnum: 2,
        data: {
          description: "Trunk port",
          tagged_vlan_list: ["DATA", "VOICE"],
          enabled: true,
        },
      },
    ],
  },
});

const mockInterfaceStatusData = () => ({
  data: {
    interface_status: {
      Ethernet1: { is_up: true, is_enabled: true, speed: 1000 },
      Ethernet2: { is_up: false, is_enabled: true, speed: 1000 },
    },
  },
});

const mockLldpData = () => ({
  data: {
    lldp_neighbors_detail: {
      Ethernet1: [
        {
          remote_system_name: "neighbor-switch",
          remote_chassis_id: "00:11:22:33:44:55",
          remote_port: "Eth1/1",
          remote_port_description: "",
          remote_system_description: "",
        },
      ],
    },
  },
});

function renderComponent(locationSearch = "?hostname=test-switch") {
  const mockLocation = { search: locationSearch };
  const mockHistory = { push: jest.fn() };

  return render(
    <InterfaceConfig location={mockLocation} history={mockHistory} />,
  );
}

describe("InterfaceConfig - Basic Rendering", () => {
  test("renders loading state initially", () => {
    getData.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderComponent();
    expect(screen.getByText(/Interface configuration/i)).toBeInTheDocument();
  });

  test("renders interface table for ACCESS device", async () => {
    // Order matters! Settings must resolve before interfaces
    getData.mockImplementation((url) => {
      console.debug("Mock getData called with:", url);

      if (url.includes("/settings")) {
        return Promise.resolve(mockSettingsData());
      }
      if (
        url.includes("/device/test-switch") &&
        !url.includes("/interfaces") &&
        !url.includes("/interface_status") &&
        !url.includes("/lldp")
      ) {
        return Promise.resolve(mockDeviceData("ACCESS"));
      }
      if (url.includes("/device/test-switch/interfaces")) {
        return Promise.resolve(mockInterfaceDataAccess());
      }
      if (url.includes("/device/test-switch/interface_status")) {
        return Promise.resolve(mockInterfaceStatusData());
      }
      if (url.includes("/device/test-switch/lldp")) {
        return Promise.resolve(mockLldpData());
      }
      console.debug("No mock match for:", url);
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    await waitForEthernet1();

    expect(screen.getByText("Ethernet2")).toBeInTheDocument();
  });

  test("shows sync state indicator", async () => {
    getData.mockImplementation((url) => {
      if (url.includes("/device/test-switch") && !url.includes("/interfaces")) {
        return Promise.resolve(mockDeviceData("ACCESS", true));
      }
      if (url.includes("/settings")) {
        return Promise.resolve(mockSettingsData());
      }
      return Promise.resolve({ data: { interfaces: [] } });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/sync state/i)).toBeInTheDocument();
    });
  });
});

async function changeDescriptionTo(inputDesc, newDesc) {
  const descriptionInput = screen.getByDisplayValue(inputDesc);
  await userEvent.clear(descriptionInput);
  await userEvent.type(descriptionInput, newDesc);
  return descriptionInput;
}

describe("InterfaceConfig - Interface Updates", () => {
  beforeEach(() => {
    getData.mockImplementation(defaultGetDataMock);
  });

  test("allows editing interface description", async () => {
    renderComponent();

    await waitForEthernet1();

    const descriptionInput = await changeDescriptionTo(
      "Test port",
      "Updated description",
    );

    expect(descriptionInput.value).toBe("Updated description");
  });

  test("highlights updated rows", async () => {
    renderComponent();

    await waitForEthernet1();

    const descriptionInput = screen.getByDisplayValue("Test port");
    await userEvent.type(descriptionInput, " modified");

    // The row should be marked as updated (warning class)
    const row = descriptionInput.closest("tr");
    await waitFor(() => {
      expect(row).toHaveClass("warning");
    });
  });
});

describe("InterfaceConfig - Save Operations", () => {
  beforeEach(() => {
    getData.mockImplementation(defaultGetDataMock);
    putData.mockResolvedValue({ status: "success" });
    postData.mockResolvedValue({ job_id: 123 });
  });

  test("opens save modal when clicking save button", async () => {
    renderComponent();

    await waitForEthernet1();

    const saveButton = screen.getByRole("button", { name: /save & commit/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      const modals = screen.getAllByText(/Save & commit/i);
      expect(modals.length).toBeGreaterThan(0);
    });
  });

  test("sends interface updates when saving", async () => {
    renderComponent();

    await waitForEthernet1();
    await changeDescriptionTo("Test port", "New description");

    // Open modal and save
    const saveButton = screen.getByRole("button", { name: /save & commit/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Save and dry run/i)).toBeInTheDocument();
    });

    const dryRunButton = screen.getByRole("button", {
      name: /Save and dry run/i,
    });
    await userEvent.click(dryRunButton);

    await waitFor(() => {
      expect(putData).toHaveBeenCalledWith(
        expect.stringContaining("/interfaces"),
        mockToken,
        expect.objectContaining({
          interfaces: expect.objectContaining({
            Ethernet1: expect.objectContaining({
              data: expect.objectContaining({
                description: "New description",
              }),
            }),
          }),
        }),
      );
    });
  });
});

describe("InterfaceConfig - Column Display", () => {
  beforeEach(() => {
    getData.mockImplementation(defaultGetDataMock);
  });

  test("allows toggling column visibility", async () => {
    renderComponent();

    await waitForEthernet1();

    // Open column selector
    const columnButton = screen.getByTitle("Select Columns");
    await userEvent.click(columnButton);

    // Should show column options
    await waitFor(() => {
      expect(screen.getByText(/Show extra columns/i)).toBeInTheDocument();
    });
  });

  test("saves column preferences to localStorage", async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

    renderComponent();

    await waitForEthernet1();

    const columnButton = screen.getByTitle("Select Columns");
    await userEvent.click(columnButton);

    // Toggle a column (e.g., Tags)
    const checkboxes = screen.getAllByRole("checkbox");
    const tagsCheckbox = checkboxes.find((cb) =>
      cb.closest("li")?.textContent.includes("Tags"),
    );
    await userEvent.click(tagsCheckbox);

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        "interfaceConfig",
        expect.stringContaining("accessDisplayColumns"),
      );
    });
  });
});

describe("InterfaceConfig - Interface Status", () => {
  beforeEach(() => {
    getData.mockImplementation(defaultGetDataMock);
    putData.mockResolvedValue({ status: "success" });
  });

  test("shows correct status icons for interfaces", async () => {
    renderComponent();

    await waitFor(() => {
      // Ethernet1 is up (green icon)
      const greenIcons = document.querySelectorAll(".green.circle.icon");
      expect(greenIcons.length).toBeGreaterThan(0);

      const grayIcons = document.querySelectorAll(".grey.circle.icon");
      expect(grayIcons.length).toBeGreaterThan(0);
    });
  });

  test("allows refreshing interface status", async () => {
    renderComponent();

    await waitForEthernet1();

    const refreshButton = screen.getByRole("button", {
      name: /Refresh interface status/i,
    });

    // Clear previous calls
    getData.mockClear();

    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(getData).toHaveBeenCalledWith(
        expect.stringContaining("/interface_status"),
        mockToken,
      );
    });
  });
});
