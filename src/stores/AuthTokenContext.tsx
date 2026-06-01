/* eslint-disable react-hooks/immutability */
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  Dispatch,
  ReactNode,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { storeValueIsUndefined } from "../utils/formatters";
import { getData } from "../utils/getData";
import { postData } from "../utils/sendData";
import {
  actions,
  AuthTokenAction,
  authTokenReducer,
  AuthTokenState,
  initialAuthTokenState,
} from "./authTokenReducer";

export type AuthTokenContextValue = AuthTokenState & {
  doTokenRefresh: () => Promise<void>;
  logout: () => void;
  oidcLogin: (event?: SyntheticEvent) => void;
  putToken: (newToken: string | null) => void;
  setUsername: (username: string) => void;
};

export const getSecondsUntilExpiry = (
  tokenExpiry: number | null | undefined,
): number | null => {
  if (tokenExpiry === null || tokenExpiry === undefined) {
    return null;
  }
  try {
    const now = Math.round(Date.now() / 1000);
    return Math.max(tokenExpiry - now, 0);
  } catch {
    return 0;
  }
};

// A non-throwing default keeps the original `createContext({})` behaviour:
// components rendered outside a provider see a logged-out value rather than
// crashing. (Provider always supplies a real value in the app.)
const defaultAuthTokenContextValue: AuthTokenContextValue = {
  ...initialAuthTokenState,
  doTokenRefresh: async () => {},
  logout: () => {},
  oidcLogin: () => {},
  putToken: () => {},
  setUsername: () => {},
};

export const AuthTokenContext = createContext<AuthTokenContextValue>(
  defaultAuthTokenContextValue,
);

export function AuthTokenProvider({
  children,
}: {
  readonly children?: ReactNode;
}) {
  const init = (): AuthTokenState => {
    const initialState = initialAuthTokenState;
    const tokenStored = localStorage.getItem("token");

    if (!storeValueIsUndefined(tokenStored)) {
      return authTokenReducer(initialState, {
        type: actions.LOAD_TOKEN_FROM_STORAGE,
        payload: { time: Date.now(), token: tokenStored },
      });
    }

    return initialState;
  };

  const [tokenState, dispatch]: [AuthTokenState, Dispatch<AuthTokenAction>] =
    useReducer(authTokenReducer, initialAuthTokenState, init);

  // Update username from API
  useEffect(() => {
    const updateUsernameFromAPI = () => {
      const url = `${process.env.API_URL}/api/v1.0/auth/identity`;
      getData(url, tokenState.token)
        .then((data) => {
          dispatch({ type: actions.SET_USERNAME, payload: data });
        })
        .catch(() => {
          dispatch({ type: actions.SET_USERNAME, payload: "unknown user" });
        });
    };
    if (tokenState.username === null && tokenState.token !== null) {
      updateUsernameFromAPI();
    }
  }, [tokenState.token]);

  // Set refresh token timer
  const tokenRefreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    if (tokenState.token && tokenState.tokenExpiry !== null) {
      const debounce = Math.floor(Math.random() * 30); // debounce 0 - 30 seconds
      tokenRefreshTimer.current = setTimeout(
        () => {
          doTokenRefresh();
        },
        ((getSecondsUntilExpiry(tokenState.tokenExpiry) ?? 0) -
          120 +
          debounce) *
          1000, // 2 minutes before expiry + debounce
      );
    }

    return () => {
      clearTimeout(tokenRefreshTimer.current);
    };
  }, [tokenState.token]);

  // Get token from storage on load and add storage listener
  useEffect(() => {
    const onStorageTokenUpdate = (e: StorageEvent) => {
      // Handle token change in other tab
      const { key, newValue } = e;
      if (key !== "token") return;

      if (storeValueIsUndefined(newValue)) {
        console.warn("Token has bad value", newValue);
      } else {
        dispatch({
          type: actions.SET_TOKEN,
          payload: { time: Date.now(), token: newValue as string },
        });
      }
    };

    dispatch({
      type: actions.LOAD_TOKEN_FROM_STORAGE,
      payload: { time: Date.now() },
    });
    window.addEventListener("storage", onStorageTokenUpdate);

    return () => {
      window.removeEventListener("storage", onStorageTokenUpdate);
    };
  }, []);

  // -- public functions --

  const doTokenRefresh = useCallback(async () => {
    const url = `${process.env.API_URL}/api/v1.0/auth/refresh`;
    await postData(url, tokenState.token, {})
      .then((data) => {
        const newToken = data.data.access_token;
        if (!newToken || jwtDecode(newToken).exp === tokenState.tokenExpiry) {
          throw new Error("Token refresh failed.");
        }
        putToken(newToken);
      })
      .catch((error) => {
        console.warn(error.message);
        dispatch({ type: actions.SET_TOKEN_WILL_EXPIRE, payload: true });
      });
  }, [tokenState.tokenExpiry]);

  const logout = useCallback(() => {
    dispatch({ type: actions.LOGOUT });
    dispatch({
      type: actions.SET_LOGIN_MESSAGE,
      payload: "You have been logged out",
    });
    window.location.replace("/");
  }, []);

  const oidcLogin = (event?: SyntheticEvent) => {
    if (event) {
      event.preventDefault();
    }
    // Handle redirect in Callback component
    const url = `${process.env.API_URL}/api/v1.0/auth/login`;
    window.location.replace(url);
  };

  // Only supposed to be used in 'Callback' component.

  const putToken = (newToken: string | null) => {
    if (storeValueIsUndefined(newToken)) {
      // New token value is invalid
      dispatch({ type: actions.LOGOUT });
      return;
    }

    dispatch({
      type: actions.SET_TOKEN,
      payload: { time: Date.now(), token: newToken as string },
    });
  };

  const setUsername = (username: string) => {
    dispatch({ type: actions.SET_USERNAME, payload: username });
  };

  const value = useMemo<AuthTokenContextValue>(
    () => ({
      doTokenRefresh,
      logout,
      oidcLogin,
      putToken,
      setUsername,
      ...tokenState,
    }),
    [doTokenRefresh, logout, oidcLogin, putToken, setUsername, tokenState],
  );

  return (
    <AuthTokenContext.Provider value={value}>
      {children}
    </AuthTokenContext.Provider>
  );
}

// Export custom hook
export const useAuthToken = (): AuthTokenContextValue => {
  const authContext = useContext(AuthTokenContext);

  if (!authContext) {
    throw new Error("useTokenAuth must be used within an AuthTokenProvider");
  }

  return authContext;
};
/* eslint-enable react-hooks/immutability */
