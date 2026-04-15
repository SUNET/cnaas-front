import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useDevice } from "./useDevice";
import { fetchDevice } from "../services/deviceApi";

jest.mock("../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

jest.mock("../services/deviceApi");

const mockDevice = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useDevice", () => {
  test("returns null device initially when no hostname", () => {
    const { result } = renderHook(() => useDevice(null));

    expect(result.current.device).toBeNull();
    expect(fetchDevice).not.toHaveBeenCalled();
  });

  test("fetches device data by hostname", async () => {
    fetchDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.device).not.toBeNull());

    expect(result.current.device).toEqual(
      expect.objectContaining({
        id: 42,
        hostname: "test-switch",
        device_type: "ACCESS",
        synchronized: true,
      }),
    );

    expect(fetchDevice).toHaveBeenCalledWith("test-switch", "test-token");
  });

  test("exposes all API fields from the device object", async () => {
    fetchDevice.mockResolvedValue(mockDevice);

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
    fetchDevice.mockResolvedValue(null);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(fetchDevice).toHaveBeenCalled());

    expect(result.current.device).toBeNull();
  });

  test("reload re-fetches device data", async () => {
    fetchDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.device).not.toBeNull());

    expect(fetchDevice).toHaveBeenCalledTimes(1);

    // Update mock to return different data
    fetchDevice.mockResolvedValue({
      ...mockDevice,
      synchronized: false,
      confhash: "def456",
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(fetchDevice).toHaveBeenCalledTimes(2);
    expect(result.current.device.synchronized).toBe(false);
    expect(result.current.device.confhash).toBe("def456");
  });

  test("handles empty devices array", async () => {
    fetchDevice.mockResolvedValue(null);

    const { result } = renderHook(() => useDevice("nonexistent"));

    await waitFor(() => expect(fetchDevice).toHaveBeenCalled());

    expect(result.current.device).toBeNull();
  });
});
