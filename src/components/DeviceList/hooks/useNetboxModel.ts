import { useEffect } from "react";

import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { fetchNetboxModel } from "../../../services/netbox";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";

/**
 * Cache-aware fetch of Netbox model metadata, keyed by model name.
 *
 * Multiple devices may share a model, so the cache lives by model string
 * (not deviceId). Returns the cached value or `undefined` while pending.
 */
export function useNetboxModel(model: string | null | undefined): unknown {
  const { token } = useAuthToken();
  const { state, dispatch } = useDeviceList();
  const cached =
    model != null && Object.hasOwn(state.netboxModelData, model)
      ? state.netboxModelData[model]
      : undefined;

  useEffect(() => {
    if (model == null) return;
    if (cached !== undefined) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetchNetboxModel(model, token ?? "");
        if (controller.signal.aborted) return;
        if (data) {
          dispatch({ type: actions.CACHE_NETBOX_MODEL, model, data });
        }
      } catch {
        // Swallow — leaves render without netbox model data.
      }
    })();
    return () => controller.abort();
  }, [model, token, cached, dispatch]);

  return cached;
}
