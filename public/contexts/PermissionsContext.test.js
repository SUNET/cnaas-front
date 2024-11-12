import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { getData as mockGetData } from "../utils/getData";
import { useAuthToken as mockUseAuthToken } from "./AuthTokenContext";
import {
  findPermission,
  PermissionsProvider,
  usePermissions,
} from "./PermissionsContext";

// Mock dependencies
const mockPermissions = [
  { pages: ["dashboard"], rights: ["view"] },
  { pages: ["*"], rights: ["admin"] },
];
jest.mock("../utils/getData");
jest.mock("./AuthTokenContext");

beforeEach(() => {
  mockGetData.mockResolvedValue(mockPermissions);
  mockUseAuthToken.mockReturnValue({
    token: "mockToken",
  });
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockReturnValue(JSON.stringify(mockPermissions));
});

afterEach(() => {
  global.Storage.prototype.getItem.mockReset();
  jest.clearAllMocks();
});

function TestComponent() {
  const { permissions, permissionsCheck } = usePermissions();
  return (
    <div>
      <div data-testid="permissions">{JSON.stringify(permissions)}</div>
      <div data-testid="check-permission">
        {permissionsCheck("dashboard", "view")
          ? "Has Permission"
          : "No Permission"}
      </div>
    </div>
  );
}

const renderTestComponent = async () => {
  await act(async () =>
    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>,
    ),
  );
};

test("initial state load", async () => {
  mockGetData.mockResolvedValueOnce(false);
  Storage.prototype.getItem = jest.fn(() => null);

  await renderTestComponent();

  expect(screen.getByTestId("permissions").textContent).toBe("[]");
  expect(Storage.prototype.getItem).toHaveBeenCalledTimes(2);
  await waitFor(() => {
    expect(mockGetData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/auth/permissions`,
      "mockToken",
      expect.any(Object),
    );
  });
});

test("loads permissions from localStorage", async () => {
  await renderTestComponent();

  await waitFor(() =>
    expect(screen.getByTestId("permissions").textContent).toBe(
      JSON.stringify(mockPermissions),
    ),
  );
  expect(Storage.prototype.getItem).toHaveBeenCalledTimes(2);
});

test("fetches new permissions if none stored", async () => {
  Storage.prototype.getItem = jest.fn(() => null);
  await renderTestComponent();

  await waitFor(() => {
    expect(mockGetData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/auth/permissions`,
      "mockToken",
      expect.any(Object),
    );
    expect(screen.getByTestId("permissions").textContent).toBe(
      JSON.stringify(mockPermissions),
    );
  });
});

test("does not fetch permissions are stored", async () => {
  await renderTestComponent();

  await waitFor(() => {
    expect(mockGetData).not.toHaveBeenCalled();
    expect(screen.getByTestId("permissions").textContent).toBe(
      JSON.stringify(mockPermissions),
    );
  });
});

test("correctly checks permissions", async () => {
  await renderTestComponent();

  expect(screen.getByTestId("check-permission").textContent).toBe(
    "Has Permission",
  );
});

describe("findPermission", () => {
  const permissionsMockery = [
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

  test("should return true", () => {
    const targetPage = "Groups";
    const requiredPermission = "read";
    const result = findPermission(
      permissionsMockery,
      targetPage,
      requiredPermission,
    );

    expect(result).toBe(true);
  });

  test("should return false", () => {
    const targetPage = "Devices";
    const requiredPermission = "write";
    const result = findPermission(
      permissionsMockery,
      targetPage,
      requiredPermission,
    );

    expect(result).toBe(false);
  });

  test("asterix should give both read and write access", () => {
    const targetPage = "AsterixPage";
    const resultForRead = findPermission(
      permissionsMockery,
      targetPage,
      "read",
    );
    const resultForWrite = findPermission(
      permissionsMockery,
      targetPage,
      "write",
    );

    expect(resultForRead).toBe(true);
    expect(resultForWrite).toBe(true);
  });

  test("overlapping permissions picks the most allowing", () => {
    const targetPage = "Overlapping";
    const requiredPermission = "write";
    const result = findPermission(
      permissionsMockery,
      targetPage,
      requiredPermission,
    );

    expect(result).toBe(true);
  });
});
