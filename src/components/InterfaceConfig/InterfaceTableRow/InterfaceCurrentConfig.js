import PropTypes from "prop-types";
import { Icon } from "semantic-ui-react";
import { getData } from "../../../utils/getData";
import { useEffect, useState } from "react";
import { useAuthToken } from "../../../contexts/AuthTokenContext";

InterfaceCurrentConfig.propTypes = {
  hostname: PropTypes.string,
  interface: PropTypes.string,
};

export function InterfaceCurrentConfig({ hostname, interface: interfaceName }) {
  const { token } = useAuthToken();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCofig = async () => {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/running_config?interface=${interfaceName}`;
        const resp = await getData(url, token);
        const fetchedConfig = resp.data.config;
        setConfig(fetchedConfig);
        !fetchedConfig && setError(true);
      } catch (error) {
        console.warn("Failed to fetch config", error);
        setError(true);
      }
    };

    fetchCofig();
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

InterfaceCurrentConfig.propTypes = {
  hostname: PropTypes.string.isRequired,
  interface: PropTypes.string.isRequired,
};
