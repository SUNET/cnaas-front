import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { getData } from "../../../utils/getData";
import { formatISODate } from "../../../utils/formatters";
import { useAuthToken } from "../../../contexts/AuthTokenContext";

export function GraphiteInterface({ hostname, interfaceName }) {
  const { token } = useAuthToken();
  const [graphiteData, setGraphiteData] = useState({
    ifInOctets: [],
    ifOutOctets: [],
  });
  const [errorMessage, setErrorMessage] = useState("Loading traffic data...");
  const [imageBlob, setImageBlob] = useState(null);

  useEffect(() => {
    if (!hostname || !interfaceName) return;

    const fetchGraphiteData = async () => {
      try {
        // Fetch JSON data
        const jsonUrl = `${process.env.API_URL}/graphite/render?template=nav&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1hour&until=now&format=json`;
        const resp = await getData(jsonUrl, token);

        resp.length &&
          setGraphiteData({
            ifInOctets: resp[0].datapoints,
            ifOutOctets: resp[1].datapoints,
          });
      } catch (error) {
        setErrorMessage(`Failed to load traffic data: ${error.message}`);
        console.warn("Failed to load traffic data:", error);
        setGraphiteData({
          ifInOctets: error.message,
          ifOutOctets: error.message,
        });
      }

      try {
        // Fetch PNG image
        const imageUrl = `${process.env.API_URL}/graphite/render?template=nav&title=Traffic%20bits%2Fs&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1day&until=now&format=png`;

        const response = await fetch(imageUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageBlob(blobUrl);
      } catch (error) {
        console.warn("Failed to load traffic graph:", error.message);
      }
    };

    fetchGraphiteData();

    // Cleanup blob URL on unmount or when dependencies change
    return () => {
      if (imageBlob) {
        URL.revokeObjectURL(imageBlob);
        setImageBlob(null);
      }
    };
  }, [hostname, interfaceName, token]);

  const toMbit = (value) => (value / 1000 / 1000).toFixed(2);
  const hasData =
    Array.isArray(graphiteData.ifInOctets) &&
    graphiteData.ifInOctets.length > 0;

  if (!hasData) {
    return <div>{errorMessage}</div>;
  }

  const lastInDatapoint =
    graphiteData.ifInOctets[graphiteData.ifInOctets.length - 1];
  const lastOutDatapoint =
    graphiteData.ifOutOctets[graphiteData.ifOutOctets.length - 1];
  const lastMeasurement = new Date(lastInDatapoint[1] * 1000);
  const ifLatestIn = toMbit(lastInDatapoint[0]);
  const ifLatestOut = toMbit(lastOutDatapoint[0]); // NB: this was `graphiteData.ifInOctets[graphiteData.ifOutOctets.length - 1]` before

  return (
    <div>
      <p>
        Last measurement {formatISODate(lastMeasurement.toISOString())}:
        <br />
        In: {ifLatestIn} Mbit/s , Out: {ifLatestOut} Mbit/s
      </p>
      {imageBlob && (
        <a
          href={`${process.env.MONITORING_WEB_URL}/ipdevinfo/${hostname}/#!ports`}
        >
          <img src={imageBlob} alt="Traffic graph" />
        </a>
      )}
    </div>
  );
}

GraphiteInterface.propTypes = {
  hostname: PropTypes.string.isRequired,
  interfaceName: PropTypes.string.isRequired,
};
