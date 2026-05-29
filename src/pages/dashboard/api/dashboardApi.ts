import { getData, getResponse } from "../../../utils/getData";

const API = process.env.API_URL;

// Success responses are wrapped as { status: "success", data: T }.
type ApiSuccess<T> = {
  readonly status: "success";
  readonly data: T;
};

/**
 * Repository status string, e.g.
 * "Commit <id> <branch> by <name> at <date>". Parsed by the Dashboard for
 * display. Returned verbatim by the backend.
 */
export async function fetchRepoStatus(
  repoName: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${API}/api/v1.0/repository/${repoName}`;
  const resp: ApiSuccess<string> = await getData(url, token, signal);
  return resp.data;
}

/**
 * Count devices matching a filter query string (e.g.
 * "filter[state]=MANAGED"). Reads the X-Total-Count response header.
 * Returns -1 when the header is absent or non-numeric.
 */
export async function fetchDeviceCount(
  filter: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<number> {
  const url = `${API}/api/v1.0/devices?${filter}`;
  const resp = await getResponse(url, token ?? undefined, signal);
  const header = resp.headers.get("X-Total-Count");
  if (header === null || Number.isNaN(Number(header))) return -1;
  return Number(header);
}

export type SystemVersion = {
  readonly version?: string;
  readonly git_version?: string;
};

export async function fetchSystemVersion(
  token: string | null,
  signal?: AbortSignal,
): Promise<SystemVersion> {
  const url = `${API}/api/v1.0/system/version`;
  const resp: ApiSuccess<SystemVersion> = await getData(url, token, signal);
  return resp.data;
}
