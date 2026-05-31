import { getData } from "../../utils/getData";
import { deleteData, postData } from "../../utils/sendData";

const API = process.env.API_URL;

// A firmware image as shown in the list — the merged view of what's available
// in the central repo and/or already downloaded to this local NMS instance.
// `filename` plus the three frontend-derived booleans are always set; the rest
// is approval/metadata that only the central repo carries (NMS-only files have
// none of it). `default_to`/`linked_to` describe the EOS-stable symlink that
// marks a file as the ZTP default (set by the user via "Set as default").
export type FirmwareFile = {
  readonly filename: string;
  readonly approved: boolean;
  readonly present_in_repo: boolean;
  readonly already_downloaded: boolean;
  readonly sha1sum?: string;
  readonly os_version?: string;
  readonly approved_by?: string;
  readonly approved_date?: string;
  readonly end_of_life_date?: string;
  readonly default_to?: string;
  readonly linked_to?: string;
};

// Raw entry from the central repo metadata (FIRMWARE_REPO_METADATA_URL),
// a bare { firmwares: [...] } envelope with no status/data wrapper.
type RepoFirmwareEntry = {
  readonly filename: string;
  readonly approved: boolean;
  readonly sha1sum?: string;
  readonly os_version?: string;
  readonly approved_by?: string;
  readonly approved_date?: string;
  readonly end_of_life_date?: string;
};
type RepoFirmwareResponse = {
  readonly firmwares?: readonly RepoFirmwareEntry[];
  // ISO timestamp of when the central repo metadata was last regenerated.
  readonly updated?: string;
};

// What fetchRepoFirmware hands back: the mapped firmware files plus the repo's
// own last-updated timestamp (shown in the UI).
export type RepoFirmware = {
  readonly firmwares: FirmwareFile[];
  readonly updated?: string;
};

// GET /api/v1.0/firmware — standard API envelope. `data.files` are filenames
// downloaded to this NMS; `data.defaults` link a real file to its EOS-stable
// symlink (the ZTP default).
type FirmwareDefault = {
  readonly file: string;
  readonly default: string;
};
type NmsFirmwareResponse = {
  readonly data: {
    readonly files?: readonly string[];
    readonly defaults?: readonly FirmwareDefault[];
  };
};

export async function fetchRepoFirmware(
  signal?: AbortSignal,
): Promise<RepoFirmware> {
  const url = process.env.FIRMWARE_REPO_METADATA_URL;
  if (!url) return { firmwares: [] };
  try {
    const data: RepoFirmwareResponse = await getData(url, undefined, signal);
    return {
      firmwares: (data.firmwares ?? []).map((entry) => ({
        ...entry,
        present_in_repo: true,
        already_downloaded: false,
      })),
      updated: data.updated,
    };
  } catch {
    return { firmwares: [] };
  }
}

export async function fetchNmsFirmware(
  token: string | null,
  signal?: AbortSignal,
): Promise<FirmwareFile[]> {
  try {
    const { data }: NmsFirmwareResponse = await getData(
      `${API}/api/v1.0/firmware`,
      token,
      signal,
    );
    const files = data.files ?? [];
    const defaults = data.defaults ?? [];
    return files.map((filename) => ({
      filename,
      approved: false,
      present_in_repo: false,
      already_downloaded: true,
      default_to: defaults.find((d) => d.file === filename)?.default,
      linked_to: defaults.find((d) => d.default === filename)?.file,
    }));
  } catch {
    return [];
  }
}

// Order firmware for display: 64-bit images (EOS64-…) first, then 32-bit
// (EOS-…); within each group newest version on top. We treat the token before
// the first "-" as the platform prefix ("EOS64"/"EOS") and compare the rest
// numerically in reverse so higher versions sort first.
function is64bit(filename: string): boolean {
  return filename.split("-")[0].includes("64");
}

export function compareFirmwareFiles(a: string, b: string): number {
  const a64 = is64bit(a);
  const b64 = is64bit(b);
  if (a64 !== b64) return a64 ? -1 : 1;
  // same bitness — newest version first (descending natural order)
  return b.localeCompare(a, undefined, { numeric: true });
}

// Combine repo + NMS views into a single sorted list. Pure — never mutates its
// inputs. A file present in both keeps the repo entry, OR-ing in the NMS flags;
// NMS-only files are appended.
export function mergeFirmwareData(
  repoData: readonly FirmwareFile[],
  nmsData: readonly FirmwareFile[],
): FirmwareFile[] {
  const merged = repoData.map((firmware) => {
    const nms = nmsData.find((obj) => obj.filename === firmware.filename);
    if (!nms) return firmware;
    return {
      ...firmware,
      present_in_repo: true,
      already_downloaded: firmware.already_downloaded || nms.already_downloaded,
      default_to: firmware.default_to || nms.default_to,
      approved: firmware.approved || nms.approved,
      linked_to: firmware.linked_to || nms.linked_to,
    };
  });

  const nmsOnly = nmsData.filter(
    (firmware) => !repoData.some((f) => f.filename === firmware.filename),
  );

  return [...merged, ...nmsOnly].sort((a, b) =>
    compareFirmwareFiles(a.filename, b.filename),
  );
}

// Kick off a background job that downloads `filename` from the central repo to
// this NMS instance. Resolves with the job id to track over Socket.IO.
export async function copyFirmware(
  filename: string,
  sha1sum: string | undefined,
  token: string | null,
): Promise<number> {
  const data: { job_id?: unknown } = await postData(
    `${API}/api/v1.0/firmware`,
    token,
    {
      url: `${process.env.FIRMWARE_REPO_URL}${filename}`,
      sha1: sha1sum,
      verify_tls: true,
    },
  );
  if (typeof data.job_id !== "number") {
    throw new Error("No job_id returned when submitting firmware copy job");
  }
  return data.job_id;
}

// Remove a firmware image that has been downloaded to this NMS instance.
export async function deleteFirmware(
  filename: string,
  token: string | null,
): Promise<void> {
  await deleteData(`${API}/api/v1.0/firmware/${filename}`, token);
}

// Point the EOS-stable symlink at `filename`, making it the ZTP default.
export async function setDefaultFirmware(
  filename: string,
  token: string | null,
): Promise<void> {
  await postData(`${API}/api/v1.0/firmware/${filename}/set-default`, token, {});
}
