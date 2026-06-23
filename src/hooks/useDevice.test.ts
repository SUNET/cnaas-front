import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useDevice } from "./useDevice";
import { fetchDevice } from "../api/deviceApi";
import type { Device } from "../types/device";

jest.mock("../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

jest.mock("../api/deviceApi");

const mockedFetchDevice = fetchDevice as jest.MockedFunction<
  typeof fetchDevice
>;

// Partial fixture — the test only exercises the fields below.
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
} as Device;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useDevice", () => {
  test("returns null device initially when no hostname", () => {
    const { result } = renderHook(() => useDevice(null));

    expect(result.current.device).toBeNull();
    expect(mockedFetchDevice).not.toHaveBeenCalled();
  });

  test("fetches device data by hostname", async () => {
    mockedFetchDevice.mockResolvedValue(mockDevice);

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

    expect(mockedFetchDevice).toHaveBeenCalledWith("test-switch", "test-token");
  });

  test("exposes all API fields from the device object", async () => {
    mockedFetchDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.device).not.toBeNull());

    const { device } = result.current;
    if (device === null) throw new Error("expected device to be loaded");
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
    mockedFetchDevice.mockResolvedValue(null);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(mockedFetchDevice).toHaveBeenCalled());

    expect(result.current.device).toBeNull();
  });

  test("reload re-fetches device data", async () => {
    mockedFetchDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useDevice("test-switch"));

    await waitFor(() => expect(result.current.device).not.toBeNull());

    expect(mockedFetchDevice).toHaveBeenCalledTimes(1);

    // Update mock to return different data
    mockedFetchDevice.mockResolvedValue({
      ...mockDevice,
      synchronized: false,
      confhash: "def456",
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(mockedFetchDevice).toHaveBeenCalledTimes(2);
    const { device } = result.current;
    if (device === null) throw new Error("expected device to be loaded");
    expect(device.synchronized).toBe(false);
    expect(device.confhash).toBe("def456");
  });

  test("handles empty devices array", async () => {
    mockedFetchDevice.mockResolvedValue(null);

    const { result } = renderHook(() => useDevice("nonexistent"));

    await waitFor(() => expect(mockedFetchDevice).toHaveBeenCalled());

    expect(result.current.device).toBeNull();
  });
});
