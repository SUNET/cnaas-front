import "@testing-library/jest-dom"; // Add this import for jest-dom matchers
import { render, screen, waitFor } from "@testing-library/react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { getData } from "../utils/getData";
import Callback from "./Callback";

jest.mock("../contexts/AuthTokenContext");
jest.mock("../contexts/PermissionsContext");
jest.mock("../utils/getData");

const { PERMISSIONS_DISABLED } = process.env;

describe("Callback Component", () => {
  const mockPutToken = jest.fn();
  const mockSetUsername = jest.fn();
  const mockPutPermissions = jest.fn();

  beforeEach(() => {
    useAuthToken.mockReturnValue({
      putToken: mockPutToken,
      setUsername: mockSetUsername,
    });
    usePermissions.mockReturnValue({
      putPermissions: mockPutPermissions,
    });

    Object.defineProperty(window, "location", {
      value: {
        search: "?token=some-valid-token&username=testuser",
        replace: jest.fn(),
      },
      writable: true,
    });

    // Set explicitly to false during tests
    process.env.PERMISSIONS_DISABLED = "false";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Reset to previous value
    process.env.PERMISSIONS_DISABLED = PERMISSIONS_DISABLED;
  });

  test("displays final message and logs in user with valid token", async () => {
    getData.mockResolvedValueOnce([{ permission: "some-permission" }]);

    render(<Callback />);

    await waitFor(() => {
      expect(screen.getByText("You're logged in.")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockPutToken).toHaveBeenCalledWith("some-valid-token");
    });
    await waitFor(() => {
      expect(mockSetUsername).toHaveBeenCalledWith("testuser");
    });
    await waitFor(() => {
      expect(mockPutPermissions).toHaveBeenCalledWith([
        { permission: "some-permission" },
      ]);
    });
    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith("/");
    });
  });

  test("shows error message if token is missing", () => {
    window.location.search = ""; // No token in the URL
    render(<Callback />);
    expect(
      screen.getByText("Something went wrong. Retry the login."),
    ).toBeInTheDocument();
  });

  test("displays no permissions message when user has no permissions", async () => {
    getData.mockResolvedValueOnce([]);

    render(<Callback />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "You don't seem to have any permissions within this application. Please check with an admin if this is correct.",
        ),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockPutToken).toHaveBeenCalledWith("some-valid-token");
    });
    await waitFor(() => {
      expect(mockSetUsername).toHaveBeenCalledWith("testuser");
    });
    await waitFor(() => {
      expect(mockPutPermissions).toHaveBeenCalledWith([]);
    });
  });
});
