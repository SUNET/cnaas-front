import { useCallback, useEffect, useState } from "react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { useFreshRef } from "./useFreshRef";
import { fetchDevice } from "../services/deviceApi";

/**
 * Hook that fetches a single device by hostname from the API.
 *
 * Returns { device, reload }.
 * `device` is the raw API object (id, hostname, device_type, synchronized, etc.)
 * or null while loading / on error.
 */
export function useDevice(hostname) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);
  const [device, setDevice] = useState(null);

  const reload = useCallback(async () => {
    if (!hostname) return;
    const result = await fetchDevice(hostname, tokenRef.current);
    setDevice(result);
  }, [hostname, tokenRef]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { device, reload };
}
