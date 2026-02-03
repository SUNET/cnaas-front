/* eslint-disable react-hooks/immutability */
import PropTypes from "prop-types";
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import checkResponseStatus from "../utils/checkResponseStatus";
import { storeValueIsUndefined } from "../utils/formatters";
import { getData } from "../utils/getData";
import { postData } from "../utils/sendData";
import {
  actions,
  authTokenReducer,
  initialAuthTokenState,
} from "./authTokenReducer";

export const getSecondsUntilExpiry = (tokenExpiry) => {
  try {
    const now = Math.round(Date.now() / 1000);
    return Math.max(tokenExpiry - now, 0);
  } catch {
    return 0;
  }
};

export const AuthTokenContext = createContext({});

AuthTokenProvider.propTypes = {
  children: PropTypes.node,
};

export function AuthTokenProvider({ children }) {
  const init = () => {
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

  const [tokenState, dispatch] = useReducer(
    authTokenReducer,
    initialAuthTokenState,
    init,
  );

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
  const tokenRefreshTimer = useRef();
  useEffect(() => {
    if (tokenState.token) {
      const debounce = Math.floor(Math.random() * 30); // debounce 0 - 30 seconds
      tokenRefreshTimer.current = setTimeout(
        () => {
          doTokenRefresh();
        },
        (getSecondsUntilExpiry(tokenState.tokenExpiry) - 120 + debounce) * 1000, // 2 minutes before expiry + debounce
      );
    }

    return () => {
      clearTimeout(tokenRefreshTimer.current);
    };
  }, [tokenState.token]);

  // Get token from storage on load and add storage listener
  useEffect(() => {
    const onStorageTokenUpdate = (e) => {
      // Handle token change in other tab
      const { key, newValue } = e;
      if (key !== "token") return;

      storeValueIsUndefined(newValue)
        ? console.warn("Token has bad value", newValue)
        : dispatch({
            type: actions.SET_TOKEN,
            payload: { time: Date.now(), token: newValue },
          });
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

  const login = useCallback((email, password) => {
    const url = `${process.env.API_URL}/api/v1.0/auth`;
    const loginString = `${email}:${password}`;
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(loginString)}` },
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => response.json())
      .then((data) => {
        if (!data?.access_token) {
          throw new Error(`Login failed. Response ${data}`);
        }
        putToken(data.access_token);
        dispatch({
          type: actions.SET_LOGIN_MESSAGE,
          payload: "Login successful",
        });
      })
      .catch((error) => {
        dispatch({ type: actions.LOGOUT });
        dispatch({ type: actions.SET_LOGIN_MESSAGE, payload: error.message });
        console.warn(error);
      });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: actions.LOGOUT });
    dispatch({
      type: actions.SET_LOGIN_MESSAGE,
      payload: "You have been logged out",
    });
    window.location.replace("/");
  }, []);

  const oidcLogin = (event) => {
    if (event) {
      event.preventDefault();
    }
    // Handle redirect in Callback component
    const url = `${process.env.API_URL}/api/v1.0/auth/login`;
    window.location.replace(url);
  };

  // Only supposed to be used in 'Callback' component.

  const putToken = (newToken) => {
    if (storeValueIsUndefined(newToken)) {
      // New token value is invalid
      dispatch({ type: actions.LOGOUT });
      return;
    }

    dispatch({
      type: actions.SET_TOKEN,
      payload: { time: Date.now(), token: newToken },
    });
  };

  const setUsername = (username) => {
    dispatch({ type: actions.SET_USERNAME, payload: username });
  };

  const value = useMemo(
    () => ({
      doTokenRefresh,
      login,
      logout,
      oidcLogin,
      putToken,
      setUsername,
      ...tokenState,
    }),
    [
      doTokenRefresh,
      login,
      logout,
      oidcLogin,
      putToken,
      setUsername,
      tokenState,
    ],
  );

  return (
    <AuthTokenContext.Provider value={value}>
      {children}
    </AuthTokenContext.Provider>
  );
}

// Export custom hook
export const useAuthToken = () => {
  const authContext = useContext(AuthTokenContext);

  if (!authContext) {
    throw new Error("useTokenAuth must be used within an AuthTokenProvider");
  }

  return authContext;
};
/* eslint-enable react-hooks/immutability */
