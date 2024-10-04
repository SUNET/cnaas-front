import permissionsCheck from "./permissionsCheck";

import { getData as mockGetData } from "../getData";

jest.mock("../../utils/getData");

mockGetData.mockResolvedValue({ data: { devices: [], inferfaces: [] } });
const mockStorageSetItem = jest.fn();
const mockPermissions = [
  {
    methods: ["GET"],
    endpoints: ["/devices", "/device/*", "/repository/**", "/groups"],
    pages: ["Devices", "Dashboard", "Groups"],
    rights: ["read"],
  },
  {
    methods: ["*"],
    endpoints: ["*"],
    pages: ["AsterixPage"],
    rights: ["*"],
  },
  {
    methods: ["*"],
    endpoints: ["*"],
    pages: ["Dashboard", "Groups", "Firmware", "Config change"],
    rights: ["read", "write"],
  },
  {
    pages: ["Overlapping"],
    rights: ["read"],
  },
  {
    pages: ["Overlapping"],
    rights: ["write"],
  },
];

let PERMISSIONS_DISABLED;

beforeAll(() => {
  PERMISSIONS_DISABLED = process.env.PERMISSIONS_DISABLED;
  process.env.PERMISSIONS_DISABLED = false;
  jest.spyOn(Storage.prototype, "getItem").mockReturnValue(mockPermissions);
  Storage.prototype.setItem = mockStorageSetItem;
});

afterAll(() => {
  global.Storage.prototype.getItem.mockReset();
  global.Storage.prototype.setItem.mockReset();
  process.env.PERMISSIONS_DISABLED = PERMISSIONS_DISABLED;
});

beforeEach(() => {
  mockGetData.mockClear();
  mockStorageSetItem.mockClear();
});

describe("no permission in storage", () => {
  test("should return false if no permissions nor token", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(""); // empty permissions
    jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(""); // token

    const permission = await permissionsCheck("page", "{}");

    expect(permission).toBe(false);
  });

  test("should call auth/permissions and set permissions if not in local storage", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(""); // empty permissions
    jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce("mockToken"); // token

    await permissionsCheck("page", "{}");

    expect(mockGetData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/auth/permissions`,
      "mockToken",
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "permissions",
      expect.anything(),
    );
  });
});

test("should return true", () => {
  const targetPage = "Groups";
  const requiredPermission = "read";
  const result = permissionsCheck(targetPage, requiredPermission);

  expect(result).toBe(true);
});

test("should return false", () => {
  const targetPage = "Devices";
  const requiredPermission = "write";
  const result = permissionsCheck(targetPage, requiredPermission);

  expect(result).toBe(false);
});

test("asterix should give both read and write access", () => {
  const targetPage = "AsterixPage";
  const resultForRead = permissionsCheck(targetPage, "read");
  const resultForWrite = permissionsCheck(targetPage, "write");

  expect(resultForRead).toBe(true);
  expect(resultForWrite).toBe(true);
});

test("overlapping permissions picks the most allowing", () => {
  const targetPage = "Overlapping";
  const requiredPermission = "write";
  const result = permissionsCheck(targetPage, requiredPermission);

  expect(result).toBe(true);
});
