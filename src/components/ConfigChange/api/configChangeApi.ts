import { getData } from "../../../utils/getData";
import { post } from "../../../utils/sendData";
import type { SyncHistory } from "../../../types/syncHistory";
import type {
  CommitTarget,
  ConfirmRunProgress,
  Device,
  DryRunProgress,
  LiveRunProgress,
} from "../stores/configChangeReducer";

export async function fetchDeviceList(
  token: string | null,
  target: CommitTarget,
): Promise<Device[]> {
  try {
    if (target.hostname) {
      const url = `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=${target.hostname}&filter[state]=MANAGED&per_page=1`;
      const data = await getData(url, token);
      return data.data.devices;
    }

    const urlDevices = `${process.env.API_URL}/api/v1.0/devices?filter[synchronized]=false&filter[state]=MANAGED&per_page=1000`;

    if (target.group) {
      const urlGroup = `${process.env.API_URL}/api/v1.0/groups/${target.group}`;
      const [dataDevices, dataGroup] = await Promise.all([
        getData(urlDevices, token),
        getData(urlGroup, token),
      ]);
      const groupHostnames: string[] =
        dataGroup.data.groups[target.group] ?? [];
      const hostnameSet = new Set(groupHostnames);
      return dataDevices.data.devices.filter((dev: Device) =>
        hostnameSet.has(dev.hostname),
      );
    }

    const data = await getData(urlDevices, token);
    return data.data.devices;
  } catch (error) {
    console.error("Failed to fetch device list:", error);
    return [];
  }
}

export async function fetchSyncHistory(
  token: string | null,
): Promise<SyncHistory> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device_synchistory`;
    const data = await getData(url, token);
    return data.data.hostnames;
  } catch (error) {
    console.error("Failed to fetch sync history:", error);
    return {};
  }
}

export interface DeviceSyncOptions {
  readonly dry_run?: boolean;
  readonly resync?: boolean;
  readonly comment?: string;
  readonly ticket_ref?: string;
  readonly confirm_mode?: number;
  readonly force?: boolean;
}

export interface DeviceSyncResult {
  readonly job_id: number;
  readonly totalCount: number;
}

export async function startDeviceSync(
  token: string | null,
  target: CommitTarget,
  options: DeviceSyncOptions = {},
): Promise<DeviceSyncResult> {
  const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
  const dataToSend: Record<string, unknown> = {
    ...target,
    dry_run: options.dry_run ?? true,
  };

  if (options.resync) dataToSend.resync = options.resync;
  if (options.comment) dataToSend.comment = options.comment;
  if (options.ticket_ref) dataToSend.ticket_ref = options.ticket_ref;
  if (options.confirm_mode != null && options.confirm_mode >= 0) {
    dataToSend.confirm_mode = options.confirm_mode;
  }
  if (options.force) dataToSend.force = true;

  const response = await post(url, token, dataToSend);
  const totalCountHeader = response.headers.get("X-Total-Count");
  const totalCount =
    totalCountHeader != null ? Number.parseInt(totalCountHeader, 10) : 0;

  if (Number.isNaN(totalCount)) {
    console.warn("Could not parse X-Total-Count header, only showing one page");
  }

  const responseJson = await response.json();
  return {
    job_id: responseJson.job_id,
    totalCount: Number.isNaN(totalCount) ? 0 : totalCount,
  };
}

// --- Job status polling ---

const STATUS_STOPPED = new Set(["FINISHED", "EXCEPTION", "ABORTED"]);

export type JobStatusPayload =
  | DryRunProgress
  | LiveRunProgress
  | ConfirmRunProgress;

export interface FetchJobStatusResult {
  readonly payload: JobStatusPayload;
  readonly stopped: boolean;
}

export async function fetchJobStatus(
  jobId: number,
  token: string | null,
  signal?: AbortSignal,
): Promise<FetchJobStatusResult> {
  const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;
  const response = await getData(url, token, signal);
  const payload: JobStatusPayload = response.data.jobs[0];
  return {
    payload,
    stopped: STATUS_STOPPED.has(payload.status ?? ""),
  };
}
