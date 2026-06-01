import { jwtDecode } from "jwt-decode";

import {
  actions,
  authTokenReducer,
  initialAuthTokenState,
} from "./authTokenReducer";

jest.mock("jwt-decode", () => ({ jwtDecode: jest.fn() }));

const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;

// Fixed clock: 1_000_000_000_000 ms => 1_000_000_000 s "now"
const NOW_MS = 1_000_000_000_000;
const NOW_S = NOW_MS / 1000;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe("SET_TOKEN", () => {
  test("persists the token and decodes identity + expiry", () => {
    mockJwtDecode.mockReturnValue({
      exp: NOW_S + 600,
      preferred_username: "alice",
    });

    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.SET_TOKEN,
      payload: { time: NOW_MS, token: "jwt-abc" },
    });

    expect(localStorage.getItem("token")).toBe("jwt-abc");
    expect(next.token).toBe("jwt-abc");
    expect(next.username).toBe("alice");
    expect(next.tokenExpiry).toBe(NOW_S + 600);
    expect(next.loggedIn).toBe(true);
    expect(next.tokenWillExpire).toBe(false);
  });

  test("flags tokenWillExpire when under two minutes remain", () => {
    mockJwtDecode.mockReturnValue({ exp: NOW_S + 60, sub: "bob" });

    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.SET_TOKEN,
      payload: { time: NOW_MS, token: "jwt-soon" },
    });

    expect(next.tokenWillExpire).toBe(true);
    expect(next.loggedIn).toBe(true);
    expect(next.username).toBe("bob");
  });

  test("falls back to email when preferred_username is absent", () => {
    mockJwtDecode.mockReturnValue({ exp: NOW_S + 600, email: "c@example.com" });

    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.SET_TOKEN,
      payload: { time: NOW_MS, token: "jwt-email" },
    });

    expect(next.username).toBe("c@example.com");
  });
});

describe("LOAD_TOKEN_FROM_STORAGE", () => {
  test("loads and decodes a token already in storage", () => {
    localStorage.setItem("token", "jwt-stored");
    mockJwtDecode.mockReturnValue({
      exp: NOW_S + 600,
      preferred_username: "dora",
    });

    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.LOAD_TOKEN_FROM_STORAGE,
      payload: { time: NOW_MS },
    });

    expect(next.token).toBe("jwt-stored");
    expect(next.username).toBe("dora");
    expect(next.loggedIn).toBe(true);
  });

  test("clears auth state when storage has no usable token", () => {
    const next = authTokenReducer(
      { ...initialAuthTokenState, token: "stale", loggedIn: true },
      { type: actions.LOAD_TOKEN_FROM_STORAGE, payload: { time: NOW_MS } },
    );

    expect(next.token).toBeNull();
    expect(next.loggedIn).toBe(false);
    expect(next.tokenExpiry).toBeNull();
    expect(mockJwtDecode).not.toHaveBeenCalled();
  });
});

describe("LOGOUT", () => {
  test("removes the stored token and resets auth state", () => {
    localStorage.setItem("token", "jwt-live");

    const next = authTokenReducer(
      {
        ...initialAuthTokenState,
        token: "jwt-live",
        loggedIn: true,
        username: "eve",
        tokenExpiry: NOW_S + 600,
      },
      { type: actions.LOGOUT },
    );

    expect(localStorage.getItem("token")).toBeNull();
    expect(next.token).toBeNull();
    expect(next.loggedIn).toBe(false);
    expect(next.username).toBe("");
    expect(next.loginMessage).toBe("You have been logged out");
  });
});

describe("simple field updates", () => {
  test("SET_TOKEN_WILL_EXPIRE toggles the flag", () => {
    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.SET_TOKEN_WILL_EXPIRE,
      payload: true,
    });
    expect(next.tokenWillExpire).toBe(true);
  });

  test("SET_USERNAME sets the username", () => {
    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.SET_USERNAME,
      payload: "frank",
    });
    expect(next.username).toBe("frank");
  });

  test("SET_LOGIN_MESSAGE sets the message", () => {
    const next = authTokenReducer(initialAuthTokenState, {
      type: actions.SET_LOGIN_MESSAGE,
      payload: "Login successful",
    });
    expect(next.loginMessage).toBe("Login successful");
  });
});
