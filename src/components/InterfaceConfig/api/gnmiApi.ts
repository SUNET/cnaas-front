import { postData } from "../../../utils/sendData";

/**
 * Fetch BGP neighbors for a VRF via gNMI.
 * Returns parsed JSON response from gNMI endpoint.
 */
export async function fetchBgpNeighbors(
  managementIp: string,
  vrfName: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const url = `${process.env.API_URL}/gnmi/api/v1.0/gnmic/get/`;
  return postData(url, token, {
    host: managementIp,
    path: `/network-instances/network-instance[name=${vrfName}]/protocols/protocol[identifier=BGP][name=BGP]/bgp/neighbors`,
  });
}
