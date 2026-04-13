import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { getData } from "../utils/getData";
import { Callback } from "./Callback";

jest.mock("../contexts/AuthTokenContext");
jest.mock("../contexts/PermissionsContext");
jest.mock("../utils/getData");

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

  beforeEach(() => {
    useAuthToken.mockReturnValue({
      token: null,
      putToken: mockPutToken,
      setUsername: mockSetUsername,
    });
    usePermissions.mockReturnValue({
      putPermissions: mockPutPermissions,
    });

    delete window.location;
    window.location = { replace: mockReplace };

    process.env.PERMISSIONS_DISABLED = "false";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.PERMISSIONS_DISABLED = PERMISSIONS_DISABLED;
  });

  test("processes OIDC redirect and navigates home", async () => {
    getData.mockResolvedValueOnce([{ permission: "some-permission" }]);

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
    useAuthToken.mockReturnValue({
      token: "existing-token",
      putToken: mockPutToken,
      setUsername: mockSetUsername,
    });

    renderCallback("/callback");

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockPutToken).not.toHaveBeenCalled();
  });

  test("displays no permissions message when user has no permissions", async () => {
    getData.mockResolvedValueOnce([]);

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
