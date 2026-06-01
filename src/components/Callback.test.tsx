import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { useAuthToken } from "../stores/AuthTokenContext";
import { initialAuthTokenState } from "../stores/authTokenReducer";
import { usePermissions } from "../stores/PermissionsContext";
import { getData } from "../utils/getData";
import { Callback } from "./Callback";

jest.mock("../stores/AuthTokenContext");
jest.mock("../stores/PermissionsContext");
jest.mock("../utils/getData");

const mockUseAuthToken = useAuthToken as jest.MockedFunction<
  typeof useAuthToken
>;
const mockUsePermissions = usePermissions as jest.MockedFunction<
  typeof usePermissions
>;
const mockGetData = getData as jest.MockedFunction<typeof getData>;

const { PERMISSIONS_DISABLED } = process.env;

function renderCallback(
  initialEntry = "/callback?token=some-valid-token&username=testuser",
) {
  const router = createMemoryRouter(
    [{ path: "/callback", element: <Callback /> }],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

describe("Callback Component", () => {
  const mockPutToken = jest.fn();
  const mockSetUsername = jest.fn();
  const mockPutPermissions = jest.fn();
  const mockReplace = jest.fn();

  const authTokenValue = (
    overrides: Partial<ReturnType<typeof useAuthToken>>,
  ): ReturnType<typeof useAuthToken> => ({
    ...initialAuthTokenState,
    doTokenRefresh: jest.fn(),
    logout: jest.fn(),
    oidcLogin: jest.fn(),
    putToken: mockPutToken,
    setUsername: mockSetUsername,
    ...overrides,
  });

  const permissionsValue: ReturnType<typeof usePermissions> = {
    permissions: [],
    permissionsCheck: jest.fn(),
    putPermissions: mockPutPermissions,
  };

  beforeEach(() => {
    mockUseAuthToken.mockReturnValue(authTokenValue({ token: null }));
    mockUsePermissions.mockReturnValue(permissionsValue);

    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { replace: mockReplace },
    });

    process.env.PERMISSIONS_DISABLED = "false";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.PERMISSIONS_DISABLED = PERMISSIONS_DISABLED;
  });

  test("processes OIDC redirect and navigates home", async () => {
    mockGetData.mockResolvedValueOnce([{ permission: "some-permission" }]);

    renderCallback();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockPutToken).toHaveBeenCalledWith("some-valid-token");
    expect(mockSetUsername).toHaveBeenCalledWith("testuser");
    expect(mockPutPermissions).toHaveBeenCalledWith([
      { permission: "some-permission" },
    ]);
  });

  test("shows error message if token is missing", async () => {
    renderCallback("/callback");

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Retry the login."),
      ).toBeInTheDocument();
    });
  });

  test("redirects home if already logged in and no URL params", async () => {
    mockUseAuthToken.mockReturnValue(
      authTokenValue({ token: "existing-token" }),
    );

    renderCallback("/callback");

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockPutToken).not.toHaveBeenCalled();
  });

  test("displays no permissions message when user has no permissions", async () => {
    mockGetData.mockResolvedValueOnce([]);

    renderCallback();

    await waitFor(() => {
      expect(
        screen.getByText(
          "You don't seem to have any permissions within this application. Please check with an admin if this is correct.",
        ),
      ).toBeInTheDocument();
    });
    expect(mockPutToken).toHaveBeenCalledWith("some-valid-token");
    expect(mockSetUsername).toHaveBeenCalledWith("testuser");
    expect(mockPutPermissions).toHaveBeenCalledWith([]);
  });
});
