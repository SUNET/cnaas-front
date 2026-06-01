import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "jwt-decode";
import { storeValueIsUndefined } from "../utils/formatters";

export type AuthTokenState = {
  loggedIn: boolean;
  loginMessage: string;
  token: string | null;
  tokenExpiry: number | null;
  tokenWillExpire: boolean;
  username: string;
};

export const initialAuthTokenState: AuthTokenState = {
  loggedIn: false,
  loginMessage: "",
  token: null,
  tokenExpiry: null,
  tokenWillExpire: false,
  username: "",
};

export const actions = {
  LOAD_TOKEN_FROM_STORAGE: "LOAD_TOKEN_FROM_STORAGE",
  LOGOUT: "LOGOUT",
  SET_LOGIN_MESSAGE: "SET_LOGIN_MESSAGE",
  SET_TOKEN: "SET_TOKEN",
  SET_TOKEN_WILL_EXPIRE: "SET_TOKEN_WILL_EXPIRE",
  SET_USERNAME: "SET_USERNAME",
} as const;

export type AuthTokenAction =
  | {
      type: typeof actions.LOAD_TOKEN_FROM_STORAGE;
      payload: { time: number; token?: string | null };
    }
  | { type: typeof actions.LOGOUT }
  | { type: typeof actions.SET_LOGIN_MESSAGE; payload: string }
  | { type: typeof actions.SET_TOKEN; payload: { time: number; token: string } }
  | { type: typeof actions.SET_TOKEN_WILL_EXPIRE; payload: boolean }
  | { type: typeof actions.SET_USERNAME; payload: string };

// jwt-decode's default JwtPayload lacks the OIDC username claims we read.
type DecodedAuthToken = JwtPayload & {
  preferred_username?: string;
  email?: string;
};

export function authTokenReducer(
  state: AuthTokenState,
  action: AuthTokenAction,
): AuthTokenState {
  switch (action.type) {
    case actions.LOAD_TOKEN_FROM_STORAGE: {
      const tokenStored = getTokenFromStorage();
      if (storeValueIsUndefined(tokenStored)) {
        removeTokenFromStorage();
        return {
          ...state,
          loggedIn: false,
          token: null,
          tokenExpiry: null,
          tokenWillExpire: false,
        };
      }

      const { time } = action.payload;
      return {
        ...state,
        token: tokenStored,
        ...decodeToken(time, tokenStored as string),
      };
    }
    case actions.LOGOUT: {
      removeTokenFromStorage();
      return {
        ...state,
        loginMessage: "You have been logged out",
        loggedIn: false,
        token: null,
        tokenExpiry: null,
        tokenWillExpire: false,
        username: "",
      };
    }
    case actions.SET_LOGIN_MESSAGE: {
      return {
        ...state,
        loginMessage: action.payload,
      };
    }
    case actions.SET_TOKEN: {
      const { time, token } = action.payload;
      addTokenToStorage(token);

      return {
        ...state,
        token,
        ...decodeToken(time, token),
      };
    }
    case actions.SET_TOKEN_WILL_EXPIRE: {
      return {
        ...state,
        tokenWillExpire: action.payload,
      };
    }
    case actions.SET_USERNAME: {
      return {
        ...state,
        username: action.payload,
      };
    }
    default: {
      console.warn(
        `Unknown action dispatched: ${(action as AuthTokenAction).type}`,
      );
      return state;
    }
  }
}

const decodeToken = (time: number, token: string): Partial<AuthTokenState> => {
  try {
    const decodedToken = jwtDecode<DecodedAuthToken>(token);
    const { exp } = decodedToken;
    const hasExpiry = exp !== null && exp !== undefined;
    const secondsUntilExpiry =
      exp != null ? getSecondsUntilExpiry(exp, time) : Infinity;
    return {
      username:
        decodedToken.preferred_username ??
        decodedToken.email ??
        decodedToken.sub,
      tokenExpiry: decodedToken.exp ?? null,
      loggedIn: secondsUntilExpiry > 0,
      tokenWillExpire: hasExpiry && secondsUntilExpiry < 120,
    };
  } catch {
    return {};
  }
};

const getSecondsUntilExpiry = (expiry: number, time: number): number => {
  try {
    const now = Math.round(time / 1000);
    return Math.max(expiry - now, 0);
  } catch {
    return 0;
  }
};

const TOKEN_LOCK_KEY = "TOKEN_LOCK";
const addTokenToStorage = (token: string): boolean => {
  const tokenLock = localStorage.getItem(TOKEN_LOCK_KEY);

  if (storeValueIsUndefined(tokenLock)) {
    localStorage.setItem(TOKEN_LOCK_KEY, "writing"); // lock localStorage
  } else {
    console.warn("TOKEN_LOCK already in place");
    return false;
  }

  console.debug("TOKEN_LOCK aquired");
  localStorage.setItem("token", token);
  localStorage.removeItem(TOKEN_LOCK_KEY); // unlock localStorage
  console.debug("TOKEN_LOCK released");
  return true;
};

const removeTokenFromStorage = (): void => {
  localStorage.removeItem("token");
};

const getTokenFromStorage = (): string | null => {
  return localStorage.getItem("token");
};
