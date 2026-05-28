import { useEffect, useState } from "react";
import { formatISODate } from "../../../../utils/formatters";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";
import {
  fetchGraphiteImage,
  fetchGraphiteJson,
  type GraphiteJsonResult,
} from "../../api/graphiteApi";

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
  const [graphiteData, setGraphiteData] = useState<GraphiteJsonResult>(null);
  const [errorMessage, setErrorMessage] = useState("Loading traffic data...");
  const [imageBlob, setImageBlob] = useState<string | null>(null);

  useEffect(() => {
    if (!hostname || !interfaceName) return;

    const load = async () => {
      try {
        const data = await fetchGraphiteJson(hostname, interfaceName, token);
        if (data) {
          setGraphiteData(data);
        } else {
          setErrorMessage("No traffic data available");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Failed to load traffic data: ${message}`);
        console.warn("Failed to load traffic data:", error);
      }

      try {
        const blob = await fetchGraphiteImage(hostname, interfaceName, token);
        const blobUrl = URL.createObjectURL(blob);
        setImageBlob(blobUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("Failed to load traffic graph:", message);
      }
    };

    load();
  }, [hostname, interfaceName, token]);

  // Revoke blob URL when it changes or on unmount
  useEffect(() => {
    if (!imageBlob) return;
    return () => URL.revokeObjectURL(imageBlob);
  }, [imageBlob]);

  const toMbit = (value: number) => (value / 1000 / 1000).toFixed(2);

  if (!graphiteData || graphiteData.ifInOctets.length === 0) {
    return <div>{errorMessage}</div>;
  }

  const { ifInOctets, ifOutOctets } = graphiteData;
  const lastInDatapoint = ifInOctets[ifInOctets.length - 1];
  const lastOutDatapoint = ifOutOctets[ifOutOctets.length - 1];
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
