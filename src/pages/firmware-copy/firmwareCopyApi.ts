import { getData } from "../../utils/getData";

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
): Promise<FirmwareFile[]> {
  const url = process.env.FIRMWARE_REPO_METADATA_URL;
  if (!url) return [];
  try {
    const data: RepoFirmwareResponse = await getData(url, undefined, signal);
    return (data.firmwares ?? []).map((entry) => ({
      ...entry,
      present_in_repo: true,
      already_downloaded: false,
    }));
  } catch {
    return [];
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
    a.filename.localeCompare(b.filename),
  );
}
