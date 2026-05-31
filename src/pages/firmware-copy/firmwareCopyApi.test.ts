import {
  type FirmwareFile,
  copyFirmware,
  deleteFirmware,
  fetchRepoFirmware,
  mergeFirmwareData,
  setDefaultFirmware,
} from "./firmwareCopyApi";
import { getData as getDataImport } from "../../utils/getData";
import {
  deleteData as deleteDataImport,
  postData as postDataImport,
} from "../../utils/sendData";

jest.mock("../../utils/getData");
jest.mock("../../utils/sendData");

const getData = getDataImport as jest.MockedFunction<typeof getDataImport>;
const postData = postDataImport as jest.MockedFunction<typeof postDataImport>;
const deleteData = deleteDataImport as jest.MockedFunction<
  typeof deleteDataImport
>;

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

  it("sorts 64-bit before 32-bit, newest version first, stable on top", () => {
    const repo = [
      repoFile({ filename: "EOS-4.32.5M.swi" }),
      repoFile({ filename: "EOS-4.32.5.1M.swi" }),
      repoFile({ filename: "EOS-4.34.6M.swi" }),
      repoFile({ filename: "EOS-stable.swi" }),
      repoFile({ filename: "EOS64-4.33.6M.swi" }),
      repoFile({ filename: "EOS64-4.34.6M.swi" }),
      repoFile({ filename: "EOS64-stable.swi" }),
    ];
    const nms = [nmsFile({ filename: "EOS64-4.32.5M.swi" })];

    const result = mergeFirmwareData(repo, nms).map((f) => f.filename);

    expect(result).toEqual([
      "EOS64-stable.swi",
      "EOS64-4.34.6M.swi",
      "EOS64-4.33.6M.swi",
      "EOS64-4.32.5M.swi",
      "EOS-stable.swi",
      "EOS-4.34.6M.swi",
      "EOS-4.32.5.1M.swi",
      "EOS-4.32.5M.swi",
    ]);
  });

  it("ranks a dotted patch release as newer than its base version", () => {
    const repo = [
      repoFile({ filename: "EOS-4.32.5M.swi" }),
      repoFile({ filename: "EOS-4.32.5.10M.swi" }),
      repoFile({ filename: "EOS-4.32.5.1M.swi" }),
    ];

    const result = mergeFirmwareData(repo, []).map((f) => f.filename);

    expect(result).toEqual([
      "EOS-4.32.5.10M.swi",
      "EOS-4.32.5.1M.swi",
      "EOS-4.32.5M.swi",
    ]);
  });

  it("does not mutate its inputs", () => {
    const repo = [repoFile({ filename: "EOS-both.swi" })];
    const nms = [nmsFile({ filename: "EOS-both.swi" })];
    const repoSnapshot = [repoFile({ filename: "EOS-both.swi" })];
    const nmsSnapshot = [nmsFile({ filename: "EOS-both.swi" })];

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

describe("copyFirmware", () => {
  beforeEach(() => {
    postData.mockReset();
    process.env.FIRMWARE_REPO_URL = "http://repo.example/firmware/";
  });

  it("posts the repo URL + sha1 and returns the job id", async () => {
    postData.mockResolvedValue({ job_id: 42 });

    const jobId = await copyFirmware("EOS-4.30.0F.swi", "abc123", "tok");

    expect(jobId).toBe(42);
    expect(postData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/firmware`,
      "tok",
      {
        url: "http://repo.example/firmware/EOS-4.30.0F.swi",
        sha1: "abc123",
        verify_tls: true,
      },
    );
  });

  it("throws when the response has no numeric job_id", async () => {
    postData.mockResolvedValue({});

    await expect(
      copyFirmware("EOS-4.30.0F.swi", "abc123", "tok"),
    ).rejects.toThrow(/job_id/);
  });
});

describe("deleteFirmware", () => {
  it("issues a DELETE to the firmware filename endpoint", async () => {
    deleteData.mockResolvedValue(undefined);

    await deleteFirmware("EOS-4.30.0F.swi", "tok");

    expect(deleteData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/firmware/EOS-4.30.0F.swi`,
      "tok",
    );
  });
});

describe("setDefaultFirmware", () => {
  it("posts to the set-default endpoint", async () => {
    postData.mockReset();
    postData.mockResolvedValue({});

    await setDefaultFirmware("EOS-4.30.0F.swi", "tok");

    expect(postData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/firmware/EOS-4.30.0F.swi/set-default`,
      "tok",
      {},
    );
  });
});
