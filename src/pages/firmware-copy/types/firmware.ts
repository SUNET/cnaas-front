// A firmware image as shown in the list — the merged view of what's available
// in the central repo and/or already downloaded to this local NMS instance.
// `filename` plus the three frontend-derived booleans are always set; the rest
// is approval/metadata that only the central repo carries (NMS-only files have
// none of it). `default_to`/`linked_to` describe the EOS-stable symlink that
// marks a file as the ZTP default (set by the user via "Set as default").
export type FirmwareFile = {
  readonly already_downloaded: boolean;
  readonly approved_by?: string;
  readonly approved_date?: string;
  readonly approved: boolean;
  readonly default_to?: string;
  readonly end_of_life_date?: string;
  readonly filename: string;
  readonly linked_to?: string;
  readonly os_version?: string;
  readonly present_in_repo: boolean;
  readonly sha1sum?: string;
  readonly sha512sum?: string;
};

// What fetchRepoFirmware hands back: the mapped firmware files plus the repo's
// own last-updated timestamp (shown in the UI).
export type RepoFirmware = {
  readonly firmwares: FirmwareFile[];
  readonly updated?: string;
};
