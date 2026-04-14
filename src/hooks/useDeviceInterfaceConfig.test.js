import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useDeviceInterfaceConfig } from "./useDeviceInterfaceConfig";
import { getData, getDataHeaders } from "../utils/getData";

jest.mock("../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

jest.mock("../utils/getData");

process.env.API_URL = "https://api.test.com";

// --- Mock data factories ---

function mockSettingsData() {
  return {
    data: {
      settings: {
        vxlans: {
          vlan100: { vni: 10100, vlan_name: "DATA", vlan_id: 100 },
          vlan200: { vni: 10200, vlan_name: "VOICE", vlan_id: 200 },
        },
        interface_tag_options: {
          uplink: { description: "Uplink port" },
          mgmt: { description: "Management port" },
        },
      },
    },
  };
}

function mockInterfacesAccess() {
  return {
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
  };
}

function mockInterfaceStatus() {
  return {
    data: {
      interface_status: {
        Ethernet1: { is_up: true, is_enabled: true, speed: 1000 },
        Ethernet2: { is_up: false, is_enabled: true, speed: 1000 },
      },
    },
  };
}

function mockLldpData() {
  return {
    data: {
      lldp_neighbors_detail: {
        Ethernet1: [
          {
            remote_system_name: "neighbor-switch",
            remote_port: "Eth1/1",
          },
        ],
      },
    },
  };
}

function mockDistGenerateConfig() {
  return {
    data: {
      config: {
        available_variables: {
          interfaces: [
            {
              name: "Ethernet1",
              ifclass: "port_template_standard",
              tags: ["dist-tag"],
            },
          ],
          port_template_options: {
            standard: {
              description: "Standard template",
              vlan_config: {},
            },
          },
        },
      },
    },
  };
}

/** Mock getData to resolve all ACCESS device endpoints */
function setupAccessMocks() {
  getData.mockImplementation((url) => {
    if (url.includes("/settings")) return Promise.resolve(mockSettingsData());
    if (url.includes("/device/test-switch/interfaces"))
      return Promise.resolve(mockInterfacesAccess());
    if (url.includes("/device/test-switch/interface_status"))
      return Promise.resolve(mockInterfaceStatus());
    if (url.includes("/device/test-switch/lldp"))
      return Promise.resolve(mockLldpData());
    return Promise.resolve({ data: {} });
  });
}

/** Mock getData + getDataHeaders to resolve all DIST device endpoints */
function setupDistMocks() {
  getData.mockImplementation((url) => {
    if (url.includes("/settings")) return Promise.resolve(mockSettingsData());
    if (url.includes("/device/dist-switch/interface_status"))
      return Promise.resolve(mockInterfaceStatus());
    if (url.includes("/device/dist-switch/lldp"))
      return Promise.resolve(mockLldpData());
    return Promise.resolve({ data: {} });
  });
  getDataHeaders.mockImplementation((url) => {
    if (url.includes("/generate_config"))
      return Promise.resolve(mockDistGenerateConfig());
    return Promise.resolve({ data: {} });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useDeviceInterfaceConfig", () => {
  test("returns correct initial state before data loads", () => {
    getData.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", null),
    );

    expect(result.current.settings).toBeNull();
    expect(result.current.interfaces).toEqual({
      data: [],
      status: {},
      lldpNeighbors: {},
    });
    expect(result.current.fieldOptions).toEqual({
      vlans: [],
      untaggedVlans: [],
      tags: [],
      portTemplates: [],
    });
    expect(result.current.mlagPeerHostname).toBeNull();
    expect(result.current.thirdPartyUpdate).toBe(false);
  });

  test("skips interface fetching when deviceType is null", () => {
    getData.mockImplementation(() => new Promise(() => {}));

    renderHook(() => useDeviceInterfaceConfig("test-switch", null));

    // Settings fetch is triggered (hostname is truthy), but no interface calls
    const calledUrls = getData.mock.calls.map((c) => c[0]);
    expect(calledUrls.some((u) => u.includes("/settings"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/interfaces"))).toBe(false);
    expect(calledUrls.some((u) => u.includes("/interface_status"))).toBe(false);
  });

  test("skips all fetching when hostname is falsy", () => {
    getData.mockImplementation(() => new Promise(() => {}));

    renderHook(() => useDeviceInterfaceConfig(null, null));

    expect(getData).not.toHaveBeenCalled();
  });

  test("loads ACCESS interface data when deviceType is ACCESS", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    // Settings loaded
    expect(result.current.settings.vxlans).toBeDefined();

    // Interfaces loaded
    expect(result.current.interfaces.data[0].name).toBe("Ethernet1");
    expect(result.current.interfaces.data[1].name).toBe("Ethernet2");

    // Interface status loaded
    expect(result.current.interfaces.status.Ethernet1.is_up).toBe(true);
    expect(result.current.interfaces.status.Ethernet2.is_up).toBe(false);

    // LLDP neighbors loaded (lowercased keys)
    expect(result.current.interfaces.lldpNeighbors.ethernet1).toBeDefined();
    expect(
      result.current.interfaces.lldpNeighbors.ethernet1[0].remote_system_name,
    ).toBe("neighbor-switch");

    // Field options built from settings
    expect(result.current.fieldOptions.vlans).toHaveLength(2);
    expect(result.current.fieldOptions.untaggedVlans).toHaveLength(3); // 2 vlans + None
    expect(result.current.fieldOptions.tags.length).toBeGreaterThanOrEqual(2);
  });

  test("builds vlan options with correct shape", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() =>
      expect(result.current.fieldOptions.vlans).toHaveLength(2),
    );

    const { vlans, untaggedVlans } = result.current.fieldOptions;

    const dataVlan = vlans.find((v) => v.value === "DATA");
    expect(dataVlan).toEqual({
      key: 10100,
      value: "DATA",
      text: "DATA",
      description: 100,
    });

    // untaggedVlans includes a "None" option
    const noneOption = untaggedVlans.find((v) => v.value === null);
    expect(noneOption).toEqual({
      value: null,
      text: "None",
      description: "NA",
    });
  });

  test("builds tag options from settings, stripping descriptions", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() =>
      expect(result.current.fieldOptions.tags.length).toBeGreaterThanOrEqual(2),
    );

    const settingsTags = result.current.fieldOptions.tags.filter(
      (t) => t.value === "uplink" || t.value === "mgmt",
    );
    for (const tag of settingsTags) {
      expect(tag).toEqual({ text: tag.value, value: tag.value });
      expect(tag).not.toHaveProperty("description");
    }
  });

  test("merges tags from interface data that are not in settings", async () => {
    // Return an interface with a tag not in settings
    getData.mockImplementation((url) => {
      if (url.includes("/settings")) return Promise.resolve(mockSettingsData());
      if (url.includes("/device/test-switch/interfaces")) {
        return Promise.resolve({
          data: {
            interfaces: [
              {
                name: "Ethernet1",
                configtype: "ACCESS_UNTAGGED",
                indexnum: 1,
                data: { tags: ["uplink", "custom-tag"] },
              },
            ],
          },
        });
      }
      if (url.includes("/device/test-switch/interface_status"))
        return Promise.resolve(mockInterfaceStatus());
      if (url.includes("/device/test-switch/lldp"))
        return Promise.resolve(mockLldpData());
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => {
      const tagValues = result.current.fieldOptions.tags.map((t) => t.value);
      expect(tagValues).toContain("custom-tag");
    });
  });

  test("loads DIST device data using generate_config endpoint", async () => {
    setupDistMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("dist-switch", "DIST"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(1));

    expect(result.current.interfaces.data[0].ifclass).toBe(
      "port_template_standard",
    );

    // Port templates built from generate_config response
    expect(result.current.fieldOptions.portTemplates).toHaveLength(1);
    expect(result.current.fieldOptions.portTemplates[0].text).toBe("standard");
  });

  test("handles settings API failure gracefully", async () => {
    getData.mockImplementation((url) => {
      if (url.includes("/settings"))
        return Promise.reject(new Error("Network error"));
      if (url.includes("/device/test-switch/interfaces"))
        return Promise.resolve(mockInterfacesAccess());
      if (url.includes("/device/test-switch/interface_status"))
        return Promise.resolve(mockInterfaceStatus());
      if (url.includes("/device/test-switch/lldp"))
        return Promise.resolve(mockLldpData());
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    // Interfaces still load even when settings fail
    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    // Settings remain null
    expect(result.current.settings).toBeNull();
    // Field options stay at defaults
    expect(result.current.fieldOptions.vlans).toEqual([]);
  });

  test("handles interface status API failure gracefully", async () => {
    getData.mockImplementation((url) => {
      if (url.includes("/settings")) return Promise.resolve(mockSettingsData());
      if (url.includes("/device/test-switch/interfaces"))
        return Promise.resolve(mockInterfacesAccess());
      if (url.includes("/device/test-switch/interface_status"))
        return Promise.reject(new Error("Timeout"));
      if (url.includes("/device/test-switch/lldp"))
        return Promise.resolve(mockLldpData());
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    // Interfaces still load
    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    // Status falls back to empty object
    expect(result.current.interfaces.status).toEqual({});
  });

  test("handles LLDP API failure gracefully", async () => {
    getData.mockImplementation((url) => {
      if (url.includes("/settings")) return Promise.resolve(mockSettingsData());
      if (url.includes("/device/test-switch/interfaces"))
        return Promise.resolve(mockInterfacesAccess());
      if (url.includes("/device/test-switch/interface_status"))
        return Promise.resolve(mockInterfaceStatus());
      if (url.includes("/device/test-switch/lldp"))
        return Promise.reject(new Error("Timeout"));
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    expect(result.current.interfaces.lldpNeighbors).toEqual({});
  });
});

describe("named actions", () => {
  test("markThirdPartyUpdate sets thirdPartyUpdate to true", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));
    expect(result.current.thirdPartyUpdate).toBe(false);

    act(() => result.current.markThirdPartyUpdate());

    expect(result.current.thirdPartyUpdate).toBe(true);
  });

  test("clearThirdPartyUpdate sets thirdPartyUpdate to false", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    act(() => result.current.markThirdPartyUpdate());
    expect(result.current.thirdPartyUpdate).toBe(true);

    act(() => result.current.clearThirdPartyUpdate());
    expect(result.current.thirdPartyUpdate).toBe(false);
  });

  test("addTagOption appends a new tag to fieldOptions", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() =>
      expect(result.current.fieldOptions.tags.length).toBeGreaterThan(0),
    );

    const tagCountBefore = result.current.fieldOptions.tags.length;

    act(() => result.current.addTagOption(null, { value: "new-custom-tag" }));

    expect(result.current.fieldOptions.tags).toHaveLength(tagCountBefore + 1);
    expect(
      result.current.fieldOptions.tags.some(
        (t) => t.value === "new-custom-tag",
      ),
    ).toBe(true);
  });

  test("addPortTemplateOption appends a new port template", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    act(() =>
      result.current.addPortTemplateOption(null, {
        value: "new-template",
      }),
    );

    expect(
      result.current.fieldOptions.portTemplates.some(
        (t) => t.value === "new-template",
      ),
    ).toBe(true);
  });

  test("addNewInterface appends a custom interface", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    act(() => result.current.addNewInterface("Loopback0"));

    expect(result.current.interfaces.data).toHaveLength(3);
    const newIf = result.current.interfaces.data[2];
    expect(newIf).toEqual({
      name: "Loopback0",
      ifclass: "custom",
      tags: null,
    });
  });
});

describe("reloadDeviceData", () => {
  test("re-fetches all data and clears thirdPartyUpdate", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    // Mark third party update, then reload
    act(() => result.current.markThirdPartyUpdate());
    expect(result.current.thirdPartyUpdate).toBe(true);

    getData.mockClear();

    await act(async () => {
      result.current.reloadDeviceData();
    });

    // thirdPartyUpdate is cleared
    expect(result.current.thirdPartyUpdate).toBe(false);

    // getData was called for settings, interfaces, status, lldp
    const calledUrls = getData.mock.calls.map((c) => c[0]);
    expect(calledUrls.some((u) => u.includes("/settings"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/interfaces"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/interface_status"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/lldp"))).toBe(true);
  });
});

describe("refreshInterfaceStatus", () => {
  test("re-fetches status and LLDP data only", async () => {
    setupAccessMocks();

    const { result } = renderHook(() =>
      useDeviceInterfaceConfig("test-switch", "ACCESS"),
    );

    await waitFor(() => expect(result.current.interfaces.data).toHaveLength(2));

    getData.mockClear();

    act(() => {
      result.current.refreshInterfaceStatus();
    });

    const calledUrls = getData.mock.calls.map((c) => c[0]);
    expect(calledUrls.some((u) => u.includes("/interface_status"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/lldp"))).toBe(true);

    // Should NOT re-fetch settings or interfaces
    expect(calledUrls.some((u) => u.includes("/settings"))).toBe(false);
    expect(
      calledUrls.some(
        (u) =>
          u.endsWith("/interfaces") ||
          u.includes("/device/test-switch/interfaces"),
      ),
    ).toBe(false);
  });
});
