import { useEffect } from "react";

import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { fetchNetboxDevice } from "../../../services/netbox";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";

/**
 * Cache-aware fetch of Netbox device data, keyed by deviceId.
 *
 * Returns the cached value or `undefined` while pending. Aborts on unmount.
 */
export function useNetboxDevice(deviceId: number, hostname: string): unknown {
  const { token } = useAuthToken();
  const { state, dispatch } = useDeviceList();
  const cached = state.netboxDeviceData[deviceId];

  useEffect(() => {
    if (cached !== undefined) return;
    const controller = new AbortController();
    async function loadNetboxDevice() {
      try {
        const data = await fetchNetboxDevice(hostname, token ?? "");
        if (controller.signal.aborted) return;
        if (data) {
          dispatch({
            type: actions.CACHE_NETBOX_DEVICE,
            deviceId,
            data,
          });
        }
      } catch {
        // Swallow — leaves render without netbox data.
      }
    }
    loadNetboxDevice();
    return () => controller.abort();
  }, [deviceId, hostname, token, cached, dispatch]);

  return cached;
}
