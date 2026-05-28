import { getData } from "../../../utils/getData";

/**
 * Fetch all linknets.
 * Returns the linknets array, or empty array on failure.
 */
export async function fetchLinknets(
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/linknets`;
    const resp = (await getData(url, token)) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { linknets?: any[] };
    };
    return resp.data.linknets ?? [];
  } catch (error) {
    console.error("Failed to fetch linknets:", error);
    return [];
  }
}
