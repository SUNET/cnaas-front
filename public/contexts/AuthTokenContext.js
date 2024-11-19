import { jwtDecode } from "jwt-decode";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { postData } from "../utils/sendData";
import { storeValueIsUndefined } from "../utils/formatters";
import { getData } from "../utils/getData";
import checkResponseStatus from "../utils/checkResponseStatus";

export const getSecondsUntilExpiry = (token) => {
  try {
    const tokenExpiry = jwtDecode(token).exp;
    const now = Math.round(Date.now() / 1000);
    return Math.max(tokenExpiry - now, 0);
  } catch {
    return 0;
  }
};

export const AuthTokenContext = createContext({});

export function AuthTokenProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [token, setToken] = useState();
  const [tokenExpiry, setTokenExpiry] = useState();
  const [tokenWillExpire, setTokenWillExpire] = useState(false);
  const [username, setUsername] = useState();

  const getAndSetUsername = (token, username) => {
    try {
      const decodedToken = jwtDecode(token);
      if (decodedToken.preferred_username || decodedToken.email) {
        setUsername(decodedToken.preferred_username || decodedToken.email);
        return;
      }
      if (username == null && token != null) {
        const url = `${process.env.API_URL}/api/v1.0/auth/identity`;
        getData(url, token).then((data) => {
          setUsername(data);
        });
      }
    } catch {
      setUsername("unknown user");
    }
  };

  const removeToken = useCallback(() => {
    setToken(null);
    localStorage.removeItem("token");
  }, []);

  // Only supposed to be used in Callback component.
  const putToken = useCallback(
    (newToken) => {
      if (storeValueIsUndefined(newToken)) {
        removeToken();
        return;
      }
      const tokenLock = localStorage.getItem("tokenlock");
      if (storeValueIsUndefined(tokenLock)) {
        localStorage.setItem("tokenlock", "writing");
        setToken(newToken);
        getAndSetUsername(newToken, username);
        const secondsUntilExpiry = getSecondsUntilExpiry(newToken);
        setLoggedIn(!!secondsUntilExpiry);
        setTokenWillExpire(secondsUntilExpiry < 120);
        localStorage.setItem("token", newToken);
        localStorage.removeItem("tokenlock");
      }
    },
    [removeToken],
  );

  // Handle token change in other tab
  const onStorageTokenUpdate = useCallback((e) => {
    const { key, newValue } = e;
    if (key === "token") {
      if (storeValueIsUndefined(newValue)) {
        return;
      }
      setToken(newValue);
      getAndSetUsername(newValue, username);
      const secondsUntilExpiry = getSecondsUntilExpiry(newValue);
      setLoggedIn(!!secondsUntilExpiry);
      setTokenWillExpire(secondsUntilExpiry < 120);
    }
  }, []);

  const login = useCallback(
    (email, password) => {
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
          setLoginMessage("Login successful");
          setLoggedIn(true);
        })
        .catch((error) => {
          removeToken();
          setLoginMessage(error.message);
          setLoggedIn(false);
          console.log(error);
        });
    },
    [putToken, removeToken],
  );

  const logout = useCallback(() => {
    removeToken();
    setUsername("");
    setLoginMessage("You have been logged out");
    setLoggedIn(false);
    window.location.replace("/");
  }, [removeToken]);

  const oidcLogin = (event) => {
    if (event) {
      event.preventDefault();
    }
    // Handle redirect in Callback component
    const url = `${process.env.API_URL}/api/v1.0/auth/login`;
    window.location.replace(url);
  };

  const doTokenRefresh = useCallback(async () => {
    const url = `${process.env.API_URL}/api/v1.0/auth/refresh`;
    await postData(url, token, {})
      .then((data) => {
        const newToken = data.data.access_token;
        if (!newToken || jwtDecode(newToken).exp === jwtDecode(token).exp) {
          throw new Error("Token refresh failed.");
        }
        putToken(newToken);
      })
      .catch((error) => {
        console.log(error.message);
        setTokenWillExpire(true);
      });
  }, [putToken, token]);

  // Set refresh token timer
  const tokenRefreshTimer = useRef();
  useEffect(() => {
    if (token) {
      setTokenExpiry(jwtDecode(token).exp);
      const debounce = Math.floor(Math.random() * 30); // debounce 0 - 30 seconds
      tokenRefreshTimer.current = setTimeout(
        () => {
          doTokenRefresh();
        },
        (getSecondsUntilExpiry(token) - 120 + debounce) * 1000, // 2 minutes before expiry + debounce
      );
    }

    return () => {
      clearTimeout(tokenRefreshTimer.current);
    };
  }, [doTokenRefresh, token]);

  useEffect(() => {
    const setAuthStateOnLoad = () => {
      const tokenStored = localStorage.getItem("token");
      if (storeValueIsUndefined(tokenStored)) {
        removeToken();
      } else {
        setToken(tokenStored);
        getAndSetUsername(tokenStored, username);
      }
      setLoggedIn(!!getSecondsUntilExpiry(tokenStored));
    };

    setAuthStateOnLoad();
    window.addEventListener("storage", onStorageTokenUpdate);

    return () => {
      window.removeEventListener("storage", onStorageTokenUpdate);
    };
  }, [onStorageTokenUpdate, removeToken]);

  const value = useMemo(
    () => ({
      doTokenRefresh,
      loggedIn,
      login,
      loginMessage,
      logout,
      oidcLogin,
      putToken,
      setUsername,
      token,
      tokenExpiry,
      tokenWillExpire,
      username,
    }),
    [
      doTokenRefresh,
      loggedIn,
      login,
      loginMessage,
      logout,
      putToken,
      setUsername,
      token,
      tokenExpiry,
      tokenWillExpire,
      username,
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
