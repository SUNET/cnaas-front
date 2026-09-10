import { getData } from "../../utils/getData";
import { deleteData, postData } from "../../utils/sendData";
import type { FirmwareFile, RepoFirmware } from "./types/firmware";

const API = process.env.API_URL;

// Raw entry from the central repo metadata (FIRMWARE_REPO_METADATA_URL),
// a bare { firmwares: [...] } envelope with no status/data wrapper.
type RepoFirmwareEntry = {
  readonly approved_by?: string;
  readonly approved_date?: string;
  readonly approved: boolean;
  readonly end_of_life_date?: string;
  readonly filename: string;
  readonly os_version?: string;
  readonly sha1sum?: string;
  readonly sha512sum?: string;
};
type RepoFirmwareResponse = {
  readonly firmwares?: readonly RepoFirmwareEntry[];
  // ISO timestamp of when the central repo metadata was last regenerated.
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

// Order firmware for display: grouped by platform prefix — 64-bit x86
// (EOS64-…) first, then 32-bit x86 (EOS-…), then arm (EOSarm-…) last, with any
// unrecognized prefix after that — and within each group, newest version on
// top.
const PLATFORM_ORDER = ["EOS64", "EOS", "EOSarm"] as const;

function platformOf(filename: string): string {
  return filename.split("-")[0];
}

// Numeric version segments of a firmware filename, e.g.
// "EOS-4.32.5.1M.swi" -> [4, 32, 5, 1]. Non-numeric tokens such as "stable"
// have no segments and rank newest, so they map to [Infinity] to float to top.
function versionSegments(filename: string): number[] {
  const token = filename.replace(/^EOS(64|arm)?-/, "").replace(/\.swi$/, "");
  const segments = token
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => !Number.isNaN(part));
  return segments.length > 0 ? segments : [Infinity];
}

// Compare version segments newest-first, most-significant segment wins. A
// missing trailing segment counts as 0, so 4.32.5.1 ranks above 4.32.5.
function compareSegments(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const [headA = 0, ...restA] = a;
  const [headB = 0, ...restB] = b;
  return headA === headB ? compareSegments(restA, restB) : headB - headA;
}

function compareByVersion(a: string, b: string): number {
  return compareSegments(versionSegments(a), versionSegments(b));
}

// Group firmware files by platform prefix, sort each group newest-first, then
// concatenate the groups in PLATFORM_ORDER (unrecognized prefixes last, in
// first-seen order).
export function sortFirmwareFiles(
  files: readonly FirmwareFile[],
): FirmwareFile[] {
  const groups = new Map<string, FirmwareFile[]>();
  for (const file of files) {
    const key = platformOf(file.filename);
    const group = groups.get(key);
    if (group) {
      group.push(file);
    } else {
      groups.set(key, [file]);
    }
  }

  const orderedKeys = [
    ...PLATFORM_ORDER,
    ...[...groups.keys()].filter(
      (key) => !PLATFORM_ORDER.includes(key as never),
    ),
  ];

  return orderedKeys.flatMap(
    (key) =>
      groups
        .get(key)
        ?.sort((a, b) => compareByVersion(a.filename, b.filename)) ?? [],
  );
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

  return sortFirmwareFiles([...merged, ...nmsOnly]);
}

// Kick off a background job that downloads `filename` from the central repo to
// this NMS instance. Resolves with the job id to track over Socket.IO.
// Prefers verifying via sha512 (the new default checksum going forward) and
// falls back to sha1 for repo entries that only carry the older checksum. The
// BE expects a `{ algorithm, checksum }` object (the legacy flat `sha1` field
// still works too, with algorithm assumed to be sha1, but being explicit here
// avoids relying on that legacy behavior).
export async function copyFirmware(
  filename: string,
  sha1sum: string | undefined,
  sha512sum: string | undefined,
  token: string | null,
): Promise<number> {
  const checksum = sha512sum
    ? { algorithm: "sha512", checksum: sha512sum }
    : { algorithm: "sha1", checksum: sha1sum };
  const data: { job_id?: unknown } = await postData(
    `${API}/api/v1.0/firmware`,
    token,
    {
      url: `${process.env.FIRMWARE_REPO_URL}${filename}`,
      checksum,
      verify_tls: true,
    },
  );
  if (typeof data.job_id !== "number") {
    throw new TypeError("No job_id returned when submitting firmware copy job");
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
