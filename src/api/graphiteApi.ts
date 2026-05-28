import { getData } from "../utils/getData";

// --- Response shapes ---

type GraphiteDatapoint = [number, number];
type GraphiteSeries = { readonly datapoints: GraphiteDatapoint[] };

export type GraphiteJsonResult = {
  readonly ifInOctets: GraphiteDatapoint[];
  readonly ifOutOctets: GraphiteDatapoint[];
} | null;

// --- URL builders ---

const graphiteJsonUrl = (hostname: string, interfaceName: string) =>
  `${process.env.API_URL}/graphite/render?template=nav&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1hour&until=now&format=json`;

const graphiteImageUrl = (hostname: string, interfaceName: string) =>
  `${process.env.API_URL}/graphite/render?template=nav&title=Traffic%20bits%2Fs&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifInOctets%2C8%29%29%2C1%29%2C%22In%22%29&target=alias%28scaleToSeconds%28nonNegativeDerivative%28scale%28nav.devices.${hostname}.ports.${interfaceName}.ifOutOctets%2C8%29%29%2C1%29%2C%22Out%22%29&from=-1day&until=now&format=png`;

// --- Type guards ---

function isGraphiteSeries(x: unknown): x is GraphiteSeries {
  return (
    typeof x === "object" &&
    x !== null &&
    Array.isArray((x as GraphiteSeries).datapoints)
  );
}

// --- API calls ---

export async function fetchGraphiteJson(
  hostname: string,
  interfaceName: string,
  token: string | null,
): Promise<GraphiteJsonResult> {
  const resp: unknown = await getData(
    graphiteJsonUrl(hostname, interfaceName),
    token,
  );
  if (!Array.isArray(resp) || resp.length < 2) return null;
  const [inSeries, outSeries] = resp;
  if (!isGraphiteSeries(inSeries) || !isGraphiteSeries(outSeries)) return null;
  return {
    ifInOctets: inSeries.datapoints,
    ifOutOctets: outSeries.datapoints,
  };
}

export async function fetchGraphiteImage(
  hostname: string,
  interfaceName: string,
  token: string | null,
): Promise<Blob> {
  const response = await fetch(graphiteImageUrl(hostname, interfaceName), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.blob();
}
