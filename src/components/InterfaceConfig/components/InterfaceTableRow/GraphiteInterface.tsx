import { useEffect, useState } from "react";
import { getData } from "../../../../utils/getData";
import { formatISODate } from "../../../../utils/formatters";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";

type GraphiteDatapoint = [number, number];
type GraphiteResponse = { datapoints: GraphiteDatapoint[] }[];

export function GraphiteInterface({
  hostname,
  interfaceName,
  showLastMeasurement = true,
}: {
  readonly hostname: string | null;
  readonly interfaceName: string;
  readonly showLastMeasurement?: boolean;
}) {
  const { token } = useAuthToken();
  const [graphiteData, setGraphiteData] = useState<{
    ifInOctets: GraphiteDatapoint[] | string;
    ifOutOctets: GraphiteDatapoint[] | string;
  }>({
    ifInOctets: [],
    ifOutOctets: [],
  });
  const [errorMessage, setErrorMessage] = useState("Loading traffic data...");
  const [imageBlob, setImageBlob] = useState<string | null>(null);

  useEffect(() => {
    if (!hostname || !interfaceName) return;

    const fetchGraphiteData = async () => {
      try {
        // TODO(I2): typed Graphite API response in api/interfaceConfigApi.ts
        const jsonUrl = `${process.env.API_URL}/graphite/render?template=nav&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1hour&until=now&format=json`;
        const resp = (await getData(jsonUrl, token)) as GraphiteResponse;

        if (resp.length) {
          setGraphiteData({
            ifInOctets: resp[0].datapoints,
            ifOutOctets: resp[1].datapoints,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Failed to load traffic data: ${message}`);
        console.warn("Failed to load traffic data:", error);
        setGraphiteData({
          ifInOctets: message,
          ifOutOctets: message,
        });
      }

      try {
        const imageUrl = `${process.env.API_URL}/graphite/render?template=nav&title=Traffic%20bits%2Fs&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1day&until=now&format=png`;

        const response = await fetch(imageUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageBlob(blobUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("Failed to load traffic graph:", message);
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

  const toMbit = (value: number) => (value / 1000 / 1000).toFixed(2);
  const hasData =
    Array.isArray(graphiteData.ifInOctets) &&
    graphiteData.ifInOctets.length > 0;

  if (!hasData) {
    return <div>{errorMessage}</div>;
  }

  const ifIn = graphiteData.ifInOctets as GraphiteDatapoint[];
  const ifOut = graphiteData.ifOutOctets as GraphiteDatapoint[];
  const lastInDatapoint = ifIn[ifIn.length - 1];
  const lastOutDatapoint = ifOut[ifOut.length - 1];
  const lastMeasurement = new Date(lastInDatapoint[1] * 1000);
  const ifLatestIn = toMbit(lastInDatapoint[0]);
  const ifLatestOut = toMbit(lastOutDatapoint[0]);

  return (
    <div>
      {showLastMeasurement && (
        <p>
          Last measurement {formatISODate(lastMeasurement.toISOString())}:
          <br />
          In: {ifLatestIn} Mbit/s , Out: {ifLatestOut} Mbit/s
        </p>
      )}
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
