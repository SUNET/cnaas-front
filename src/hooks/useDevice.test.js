import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useDevice } from "./useDevice";
import { getData } from "../utils/getData";

jest.mock("../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

jest.mock("../utils/getData");

process.env.API_URL = "https://api.test.com";

function mockDeviceResponse(overrides = {}) {
  return {
    data: {
      devices: [
        {
          id: 42,
          hostname: "test-switch",
          device_type: "ACCESS",
          synchronized: true,
          confhash: "abc123",
          model: "vEOS",
          vendor: "Arista",
          os_version: "4.28.0F",
          serial: "SN001",
          state: "MANAGED",
          infra_ip: "10.0.0.1",
          management_ip: "192.168.1.1",
          ztp_mac: "00:11:22:33:44:55",
          primary_group: "DEFAULT",
          last_seen: "2026-01-01T00:00:00Z",
          ...overrides,
        },
      ],
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useDevice", () => {
  test("returns null device and loading=false initially when no hostname", () => {
    getData.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDevice(null));

    expect(result.current.device).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getData).not.toHaveBeenCalled();
  });

  test("fetches device data by hostname", async () => {
    getData.mockResolvedValue(mockDeviceResponse());

    const { result } = renderHook(() => useDevice("test-switch"));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.device).toEqual(
      expect.objectContaining({
        id: 42,
        hostname: "test-switch",
        device_type: "ACCESS",
        synchronized: true,
      }),
    );
    expect(result.current.error).toBeNull();

    expect(getData).toHaveBeenCalledWith(
      "https://api.test.com/api/v1.0/device/test-switch",
      "test-token",
    );
  });

  test("exposes all API fields from the device object", async () => {
    getData.mockResolvedValue(mockDeviceResponse());

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.device).not.toBeNull());

    const { device } = result.current;
    expect(device.model).toBe("vEOS");
    expect(device.vendor).toBe("Arista");
    expect(device.os_version).toBe("4.28.0F");
    expect(device.serial).toBe("SN001");
    expect(device.state).toBe("MANAGED");
    expect(device.infra_ip).toBe("10.0.0.1");
    expect(device.management_ip).toBe("192.168.1.1");
    expect(device.ztp_mac).toBe("00:11:22:33:44:55");
    expect(device.primary_group).toBe("DEFAULT");
    expect(device.last_seen).toBe("2026-01-01T00:00:00Z");
  });

  test("handles API error gracefully", async () => {
    const networkError = new Error("Network error");
    getData.mockRejectedValue(networkError);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.device).toBeNull();
    expect(result.current.error).toBe(networkError);
  });

  test("reload re-fetches device data", async () => {
    getData.mockResolvedValue(mockDeviceResponse());

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.device).not.toBeNull());

    expect(getData).toHaveBeenCalledTimes(1);

    // Update mock to return different data
    getData.mockResolvedValue(
      mockDeviceResponse({ synchronized: false, confhash: "def456" }),
    );

    await act(async () => {
      await result.current.reload();
    });

    expect(getData).toHaveBeenCalledTimes(2);
    expect(result.current.device.synchronized).toBe(false);
    expect(result.current.device.confhash).toBe("def456");
  });

  test("handles empty devices array", async () => {
    getData.mockResolvedValue({ data: { devices: [] } });

    const { result } = renderHook(() => useDevice("nonexistent"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.device).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
