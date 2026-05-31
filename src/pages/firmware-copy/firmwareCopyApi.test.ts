import {
  type FirmwareFile,
  fetchRepoFirmware,
  mergeFirmwareData,
} from "./firmwareCopyApi";
import { getData as getDataImport } from "../../utils/getData";

jest.mock("../../utils/getData");

const getData = getDataImport as jest.MockedFunction<typeof getDataImport>;

function repoFile(overrides: Partial<FirmwareFile> = {}): FirmwareFile {
  return {
    filename: "EOS-4.0.0.swi",
    approved: true,
    present_in_repo: true,
    already_downloaded: false,
    ...overrides,
  };
}

function nmsFile(overrides: Partial<FirmwareFile> = {}): FirmwareFile {
  return {
    filename: "EOS-4.0.0.swi",
    approved: false,
    present_in_repo: false,
    already_downloaded: true,
    ...overrides,
  };
}

describe("mergeFirmwareData", () => {
  it("returns an empty list for empty inputs", () => {
    expect(mergeFirmwareData([], [])).toEqual([]);
  });

  it("keeps a repo-only file unchanged", () => {
    const repo = [repoFile({ filename: "EOS-1.swi" })];

    expect(mergeFirmwareData(repo, [])).toEqual(repo);
  });

  it("appends an NMS-only file", () => {
    const nms = [nmsFile({ filename: "EOS-only-nms.swi" })];

    expect(mergeFirmwareData([], nms)).toEqual(nms);
  });

  it("merges a file present in both, OR-ing the flags", () => {
    const repo = [
      repoFile({
        filename: "EOS-both.swi",
        approved: false,
        already_downloaded: false,
      }),
    ];
    const nms = [
      nmsFile({
        filename: "EOS-both.swi",
        approved: true,
        already_downloaded: true,
        default_to: "EOS-stable",
        linked_to: "EOS-real.swi",
      }),
    ];

    const [merged] = mergeFirmwareData(repo, nms);

    expect(merged).toEqual({
      filename: "EOS-both.swi",
      approved: true,
      present_in_repo: true,
      already_downloaded: true,
      default_to: "EOS-stable",
      linked_to: "EOS-real.swi",
    });
  });

  it("prefers truthy repo flags over falsy NMS flags", () => {
    const repo = [
      repoFile({
        filename: "EOS-both.swi",
        approved: true,
        already_downloaded: true,
        default_to: "EOS-stable",
      }),
    ];
    const nms = [
      nmsFile({
        filename: "EOS-both.swi",
        approved: false,
        already_downloaded: false,
      }),
    ];

    const [merged] = mergeFirmwareData(repo, nms);

    expect(merged.approved).toBe(true);
    expect(merged.already_downloaded).toBe(true);
    expect(merged.default_to).toBe("EOS-stable");
  });

  it("sorts the combined list by filename", () => {
    const repo = [
      repoFile({ filename: "EOS-c.swi" }),
      repoFile({ filename: "EOS-a.swi" }),
    ];
    const nms = [nmsFile({ filename: "EOS-b.swi" })];

    const result = mergeFirmwareData(repo, nms).map((f) => f.filename);

    expect(result).toEqual(["EOS-a.swi", "EOS-b.swi", "EOS-c.swi"]);
  });

  it("does not mutate its inputs", () => {
    const repo = [repoFile({ filename: "EOS-both.swi" })];
    const nms = [nmsFile({ filename: "EOS-both.swi" })];
    const repoSnapshot = JSON.parse(JSON.stringify(repo));
    const nmsSnapshot = JSON.parse(JSON.stringify(nms));

    mergeFirmwareData(repo, nms);

    expect(repo).toEqual(repoSnapshot);
    expect(nms).toEqual(nmsSnapshot);
  });
});

describe("fetchRepoFirmware", () => {
  const originalUrl = process.env.FIRMWARE_REPO_METADATA_URL;

  beforeEach(() => {
    process.env.FIRMWARE_REPO_METADATA_URL =
      "http://repo.example/firmware.json";
    getData.mockReset();
  });

  afterAll(() => {
    process.env.FIRMWARE_REPO_METADATA_URL = originalUrl;
  });

  it("returns the repo's updated timestamp alongside the firmwares", async () => {
    getData.mockResolvedValue({
      firmwares: [{ filename: "EOS-a.swi", approved: true }],
      updated: "2024-01-02T03:04:05Z",
    });

    const result = await fetchRepoFirmware();

    expect(result.updated).toBe("2024-01-02T03:04:05Z");
    expect(result.firmwares).toEqual([
      {
        filename: "EOS-a.swi",
        approved: true,
        present_in_repo: true,
        already_downloaded: false,
      },
    ]);
  });

  it("returns an empty result with no updated timestamp on failure", async () => {
    getData.mockRejectedValue(new Error("network down"));

    const result = await fetchRepoFirmware();

    expect(result).toEqual({ firmwares: [] });
    expect(result.updated).toBeUndefined();
  });
});
