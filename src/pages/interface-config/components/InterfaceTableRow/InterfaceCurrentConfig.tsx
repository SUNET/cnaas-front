import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useState } from "react";
import { fetchRunningConfig } from "../../api/deviceApi";
import { useAuthToken } from "../../../../stores/AuthTokenContext";

export function InterfaceCurrentConfig({
  hostname,
  interface: interfaceName,
}: {
  readonly hostname: string | null;
  readonly interface: string;
}) {
  const { token } = useAuthToken();
  const [config, setConfig] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hostname) return;
    const load = async () => {
      try {
        const fetched = await fetchRunningConfig(
          hostname,
          interfaceName,
          token,
        );
        setConfig(fetched);
        if (!fetched) setError(true);
      } catch (error) {
        console.warn("Failed to fetch config", error);
        setError(true);
      }
    };

    load();
  }, [hostname, interfaceName, token]);

  if (error) {
    return <p>Failed to load configuration</p>;
  }

  return config ? (
    <textarea key="config" defaultValue={config} rows={3} cols={50} readOnly />
  ) : (
    <CircularProgress />
  );
}
