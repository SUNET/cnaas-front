import { jwtDecode } from "jwt-decode";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { postData } from "../utils/sendData";

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
  const [isReady, setIsReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [token, setToken] = useState();
  const [tokenWillExpire, setTokenWillExpire] = useState(false);
  const [username, setUsername] = useState();

  const removeToken = useCallback(() => {
    setToken(null);
    localStorage.removeItem("token");
  }, []);

  const putToken = useCallback(
    (newToken) => {
      if (!newToken || newToken === "undefined" || newToken === "null") {
        removeToken();
        return;
      }
      setToken(newToken);
      setLoggedIn(!!getSecondsUntilExpiry(newToken));
      localStorage.setItem("token", newToken);
    },
    [removeToken],
  );

  const putUsername = useCallback((newUsername) => {
    setUsername(newUsername);
    localStorage.setItem("username", newUsername);
  }, []);

  const removeUsername = () => {
    setUsername(null);
    localStorage.removeItem("username");
  };

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
    removeUsername();
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
        if (!newToken || newToken.exp === token?.exp) {
          throw new Error("Token refresh failed");
        }
        putToken(newToken);
        setTokenWillExpire(false);
      })
      .catch((error) => {
        console.log(error);
        setTokenWillExpire(true);
      });
  }, [putToken, token]);

  // Tries to fetch token on mount.
  useEffect(() => {
    const setAuthStateOnLoad = async () => {
      const usernameStored = localStorage.getItem("username");
      const tokenStored = localStorage.getItem("token");
      if (
        !tokenStored ||
        tokenStored === "undefined" ||
        tokenStored === "null"
      ) {
        removeToken();
      } else {
        setToken(tokenStored);
      }
      setUsername(usernameStored);
      setLoggedIn(!!getSecondsUntilExpiry(tokenStored));
    };

    setAuthStateOnLoad();
    setIsReady(true);
  }, [removeToken]);

  // Set refresh token timer
  useEffect(() => {
    let tokenTimer;
    if (token) {
      tokenTimer = setTimeout(
        () => {
          doTokenRefresh();
        },
        (getSecondsUntilExpiry(token) - 120) * 1000, // 2 minutes before expiry
      );
    }

    return () => {
      clearTimeout(tokenTimer);
    };
  }, [doTokenRefresh, token]);

  const value = useMemo(
    () => ({
      doTokenRefresh,
      loggedIn,
      login,
      loginMessage,
      logout,
      oidcLogin,
      putToken,
      putUsername,
      token,
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
      putUsername,
      token,
      tokenWillExpire,
      username,
    ],
  );

  return (
    <AuthTokenContext.Provider value={value}>
      {isReady ? children : null}
    </AuthTokenContext.Provider>
  );
}

// Export custom hook
export const useAuthToken = () => {
  const authContext = useContext(AuthTokenContext);

  if (!authContext) {
    throw new Error("useTokenAuth must be used within an AuthProvider");
  }

  return authContext;
};
