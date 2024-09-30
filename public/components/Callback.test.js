import "@testing-library/jest-dom"; // Add this import for jest-dom matchers
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { getData } from "../utils/getData";
import Callback from "./Callback";

jest.mock("../contexts/AuthContext");
jest.mock("../utils/getData");

const { PERMISSIONS_DISABLED } = process.env;

describe("Callback Component", () => {
  let mockUpdateToken;
  let mockUpdateUsername;

  beforeEach(() => {
    mockUpdateToken = jest.fn();
    mockUpdateUsername = jest.fn();
    useAuth.mockReturnValue({
      updateToken: mockUpdateToken,
      updateUsername: mockUpdateUsername,
    });

    Object.defineProperty(window, "location", {
      value: {
        search: "?token=some-valid-token&username=testuser",
        replace: jest.fn(),
      },
      writable: true,
    });

    // Mocking localStorage setItem and getItem
    const localStorageMock = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
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
    getData.mockResolvedValueOnce({ permission: "some-permission" });

    render(<Callback />);

    await waitFor(() => {
      expect(screen.getByText("You're logged in.")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledWith("some-valid-token");
    });
    await waitFor(() => {
      expect(mockUpdateUsername).toHaveBeenCalledWith("testuser");
    });
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "permissions",
        JSON.stringify({ permission: "some-permission" }),
      );
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
});
