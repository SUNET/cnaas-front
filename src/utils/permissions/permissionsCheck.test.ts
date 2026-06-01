import { mockPermissions } from "../../test-utils/permissionsFixtures";
import permissionsCheck from "./permissionsCheck";

let PERMISSIONS_DISABLED: string | undefined;

beforeAll(() => {
  PERMISSIONS_DISABLED = process.env.PERMISSIONS_DISABLED;
  process.env.PERMISSIONS_DISABLED = "false";
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockReturnValue(JSON.stringify(mockPermissions));
});

afterAll(() => {
  jest.spyOn(Storage.prototype, "getItem").mockReset();
  process.env.PERMISSIONS_DISABLED = PERMISSIONS_DISABLED;
});

describe("no permission in storage", () => {
  test("should return false if no permissions nor token", () => {
    jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(""); // empty permissions
    jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(""); // token

    const permission = permissionsCheck("page", "{}");

    expect(permission).toBe(false);
  });
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

test("dry run permission", () => {
  jest.spyOn(Storage.prototype, "getItem").mockReturnValueOnce(
    JSON.stringify([
      {
        methods: ["GET"],
        endpoints: ["/devices", "/device/*", "/repository/**", "/groups"],
        pages: ["Devices", "Dashboard", "Groups"],
        rights: ["read"],
      },
      {
        methods: ["*"],
        endpoints: ["*"],
        pages: [
          "Devices",
          "Dashboard",
          "Groups",
          "Jobs",
          "Firmware",
          "Config change",
        ],
        rights: ["read", "write"],
      },
    ]),
  );
  const targetPage = "Config change";
  const requiredPermission = "write";
  const result = permissionsCheck(targetPage, requiredPermission);

  expect(result).toBe(true);
});
