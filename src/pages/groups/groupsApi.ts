import { getData } from "../../utils/getData";

const API = process.env.API_URL;

// Success responses are wrapped as { status: "success", data: T }.
type ApiSuccess<T> = {
  readonly status: "success";
  readonly data: T;
};

export type DeviceFilter = {
  readonly hostname: string;
  readonly device_type: string;
  readonly model: string;
  readonly os_version: string;
  readonly platform: string | null;
};

export type GroupSettings = {
  readonly device_filter: DeviceFilter;
  readonly devices: string[] | null;
  readonly group_priority: number;
  readonly templates_branch: string | null;
};

// GET /api/v1.0/groups payload. `groups` maps a group name to its member
// device hostnames; `group_settings` carries each group's filter/config.
export type GroupsData = {
  readonly groups: Record<string, string[]>;
  readonly group_settings: Record<string, GroupSettings>;
};

export async function fetchGroups(
  token: string | null,
  signal?: AbortSignal,
): Promise<GroupsData> {
  const url = `${API}/api/v1.0/groups`;
  const resp: ApiSuccess<GroupsData> = await getData(url, token, signal);
  return resp.data;
}
