import { Icon } from "semantic-ui-react";
import { useEffect, useState } from "react";
import { getData } from "../../../../utils/getData";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";

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
    const fetchConfig = async () => {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/running_config?interface=${interfaceName}`;
        // TODO(I2): typed API response in api/interfaceConfigApi.ts
        const resp = (await getData(url, token)) as {
          data: { config: string };
        };
        const fetchedConfig = resp.data.config;
        setConfig(fetchedConfig);
        if (!fetchedConfig) setError(true);
      } catch (error) {
        console.warn("Failed to fetch config", error);
        setError(true);
      }
    };

    fetchConfig();
  }, [hostname, interfaceName, token]);

  if (error) {
    return <p>Failed to load configuration</p>;
  }

  return config ? (
    <textarea key="config" defaultValue={config} rows={3} cols={50} readOnly />
  ) : (
    <Icon name="spinner" loading />
  );
}
