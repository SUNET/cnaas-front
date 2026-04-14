import { useCallback, useEffect, useState } from "react";
import { getData } from "../utils/getData";
import { useAuthToken } from "../contexts/AuthTokenContext";

/**
 * Hook that fetches a single device by hostname from the API.
 *
 * Returns { device, loading, error, reload }.
 * `device` is the raw API object (id, hostname, device_type, synchronized, etc.)
 * or null while loading / on error.
 */
export function useDevice(hostname) {
  const { token } = useAuthToken();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDevice = useCallback(async () => {
    if (!hostname) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}`;
      const fetched = (await getData(url, token)).data.devices[0];
      setDevice(fetched ?? null);
    } catch (err) {
      console.error(`Failed to fetch device ${hostname}:`, err);
      setError(err);
      setDevice(null);
    } finally {
      setLoading(false);
    }
  }, [hostname, token]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  return { device, loading, error, reload: fetchDevice };
}
