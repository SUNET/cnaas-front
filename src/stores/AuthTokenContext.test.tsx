import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jwtDecode } from "jwt-decode";

import { getData } from "../utils/getData";
import { postData } from "../utils/sendData";
import {
  AuthTokenProvider,
  getSecondsUntilExpiry,
  useAuthToken,
} from "./AuthTokenContext";

jest.mock("jwt-decode", () => ({ jwtDecode: jest.fn() }));
jest.mock("../utils/getData");
jest.mock("../utils/sendData");

const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;
const mockGetData = getData as jest.MockedFunction<typeof getData>;
const mockPostData = postData as jest.MockedFunction<typeof postData>;

const NOW_S = Math.round(Date.now() / 1000);

describe("getSecondsUntilExpiry", () => {
  test("returns positive seconds for future expiry", () => {
    const result = getSecondsUntilExpiry(NOW_S + 600);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(600);
  });

  test("returns 0 for past expiry", () => {
    expect(getSecondsUntilExpiry(NOW_S - 60)).toBe(0);
  });

  test("returns null when tokenExpiry is null", () => {
    expect(getSecondsUntilExpiry(null)).toBeNull();
  });

  test("returns null when tokenExpiry is undefined", () => {
    expect(getSecondsUntilExpiry(undefined)).toBeNull();
  });
});

function AuthConsumer() {
  const { token, loginMessage, loggedIn, logout, doTokenRefresh } =
    useAuthToken();
  return (
    <div>
      <span data-testid="token">{token ?? "none"}</span>
      <span data-testid="message">{loginMessage}</span>
      <span data-testid="loggedIn">{String(loggedIn)}</span>
      <button type="button" onClick={() => doTokenRefresh()}>
        refresh
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthTokenProvider>
      <AuthConsumer />
    </AuthTokenProvider>,
  );
}

const originalLocation = window.location;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockGetData.mockResolvedValue("alice");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { replace: jest.fn() },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("refresh flow", () => {
  test("replaces the token with a freshly refreshed one", async () => {
    // Different exp per token so the refresh is accepted (new exp !== current).
    mockJwtDecode.mockImplementation((t) =>
      t === "refresh-jwt"
        ? { exp: NOW_S + 1200 }
        : { exp: NOW_S + 600, preferred_username: "alice" },
    );
    localStorage.setItem("token", "seed-jwt");
    mockPostData.mockResolvedValue({ data: { access_token: "refresh-jwt" } });

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("seed-jwt"),
    );

    await userEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("refresh-jwt"),
    );
    expect(localStorage.getItem("token")).toBe("refresh-jwt");
  });
});

describe("logout flow", () => {
  test("clears the token, sets the logout message and redirects home", async () => {
    mockJwtDecode.mockReturnValue({
      exp: NOW_S + 600,
      preferred_username: "alice",
    });
    localStorage.setItem("token", "seed-jwt");

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loggedIn")).toHaveTextContent("true"),
    );

    await userEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("none"),
    );
    expect(screen.getByTestId("message")).toHaveTextContent(
      "You have been logged out",
    );
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.replace).toHaveBeenCalledWith("/");
  });
});
