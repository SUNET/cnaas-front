import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { getData } from "../../utils/getData";
import { formatISODate } from "../../utils/formatters";
import { useAuthToken } from "../../contexts/AuthTokenContext";

const checkResponseStatus = require("../../utils/checkResponseStatus");

function GraphiteInterface({ hostname, interfaceName }) {
  const [graphiteData, setGraphiteData] = useState({
    ifInOctets: [],
    ifOutOctets: [],
  });
  const [errorMessage, setErrorMessage] = useState("Loading traffic data...");

  const [imageBlob, setImageBlob] = useState(null);
  const { token } = useAuthToken();

  function getGraphiteData() {
    getData(
      `${process.env.API_URL}/graphite/render?template=nav&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1hour&until=now&format=json`,
      token,
    )
      .then((resp) => {
        setGraphiteData({
          ifInOctets: resp[0].datapoints,
          ifOutOctets: resp[1].datapoints,
        });
      })
      .catch((error) => {
        // loading status
        setErrorMessage(`Failed to load traffic data: ${error.message}`);
        setGraphiteData({
          ifInOctets: error.message,
          ifOutOctets: error.message,
        });
      });

    fetch(
      `${process.env.API_URL}/graphite/render?template=nav&title=Traffic%20bits%2Fs&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1day&until=now&format=png`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      },
    )
      .then((response) => checkResponseStatus(response))
      .then((resp) => {
        return resp.blob();
      })
      .then((blob) => {
        setImageBlob(URL.createObjectURL(blob));
      })
      .catch((error) => {
        console.log("Failed to load traffic graph: ", error.message);
      });
  }

  useEffect(() => {
    if (hostname) {
      getGraphiteData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(imageBlob);
      setImageBlob(null);
      console.log("cleaned up");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    !Array.isArray(graphiteData.ifInOctets) ||
    graphiteData.ifInOctets.length === 0
  ) {
    return <div>{errorMessage}</div>;
  }

  function toMbit(value) {
    return (value / 1000 / 1000).toFixed(2);
  }

  const lastMeasurement = new Date(
    graphiteData.ifInOctets[graphiteData.ifInOctets.length - 1][1] * 1000,
  );
  const ifLatestIn = toMbit(
    graphiteData.ifInOctets[graphiteData.ifInOctets.length - 1][0],
  );
  const ifLatestOut = toMbit(
    graphiteData.ifInOctets[graphiteData.ifOutOctets.length - 1][0],
  );

  return (
    <div key="graphiteData">
      <p key="lastMeasurement">
        Last measurement {formatISODate(lastMeasurement.toISOString())}:<br />
        In: {ifLatestIn} Mbit/s , Out: {ifLatestOut} Mbit/s
      </p>
      {imageBlob && (
        <a
          href={`${process.env.MONITORING_WEB_URL}/ipdevinfo/${hostname}/#!ports`}
        >
          <img key="graph" src={imageBlob} alt="Traffic graph" />
        </a>
      )}
    </div>
  );
}

GraphiteInterface.propTypes = {
  hostname: PropTypes.string.isRequired,
  interfaceName: PropTypes.string.isRequired,
};

export default GraphiteInterface;
