import { useEffect } from "react";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import { fetchDeviceInterfaces } from "../api/deviceListApi";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import type { DeviceInterface } from "../types/deviceInterface";

/**
 * Cache-aware fetch of a device's interfaces, keyed by deviceId.
 *
 * Returns the cached interfaces or `undefined` while a fetch is in flight
 * (or never triggered). On unmount/dep-change the in-flight request still
 * runs to completion server-side; the controller flag only prevents a
 * stale dispatch.
 */
export function useDeviceInterfaces(
  deviceId: number,
  hostname: string,
): readonly DeviceInterface[] | undefined {
  const { token } = useAuthToken();
  const { state, dispatch } = useDeviceList();
  const cached = state.deviceInterfaceData[deviceId];

  useEffect(() => {
    if (cached) return;
    const controller = new AbortController();
    async function loadDeviceInterfaces() {
      try {
        const interfaces = await fetchDeviceInterfaces(hostname, token);
        if (controller.signal.aborted) return;
        dispatch({
          type: actions.CACHE_INTERFACES,
          deviceId,
          interfaces,
        });
      } catch {
        // Swallow — leaves render without interfaces; rerender on retry.
      }
    }
    loadDeviceInterfaces();
    return () => controller.abort();
  }, [deviceId, hostname, token, cached, dispatch]);

  return cached;
}
