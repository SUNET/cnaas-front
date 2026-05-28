import { useEffect } from "react";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import { fetchNetboxModel } from "../../../api/netboxApi";
import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";

/**
 * Cache-aware fetch of Netbox model metadata, keyed by model name.
 *
 * Multiple devices may share a model, so the cache lives by model string
 * (not deviceId). Returns the cached value or `undefined` while pending.
 * On unmount the in-flight request still runs to completion server-side;
 * the controller flag only prevents a stale dispatch.
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
    const modelName = model;
    const controller = new AbortController();
    async function loadNetboxModel() {
      try {
        const data = await fetchNetboxModel(modelName, token ?? "");
        if (controller.signal.aborted) return;
        if (data) {
          dispatch({
            type: actions.CACHE_NETBOX_MODEL,
            model: modelName,
            data,
          });
        }
      } catch {
        // Swallow — leaves render without netbox model data.
      }
    }
    loadNetboxModel();
    return () => controller.abort();
  }, [model, token, cached, dispatch]);

  return cached;
}
