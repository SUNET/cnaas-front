import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import checkResponseStatus from "../utils/checkResponseStatus";

export const AuthContext = createContext({});

export function AuthContextProvider({ children }) {
  const [token, setToken] = useState();
  const [username, setUsername] = useState();
  const [isReady, setIsReady] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  /*
   * Tries to fetch token on mount.
   */
  useEffect(() => {
    const fetchTokenOnLoad = async () => {
      const usernameStored = localStorage.getItem("user");
      const tokenStored = localStorage.getItem("token");
      setToken(tokenStored);
      setUsername(usernameStored);
      if (tokenStored) {
        setLoggedIn(true);
      }
    };

    fetchTokenOnLoad();
    setIsReady(true);
  }, []);

  const updateToken = useCallback((newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  }, []);

  const removeToken = () => {
    setToken(null);
    localStorage.removeItem("token");
  };

  const updateUsername = useCallback((newUsername) => {
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
          updateToken(data.access_token);
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
    [updateToken],
  );

  const logout = useCallback(() => {
    removeToken();
    removeUsername();
    localStorage.removeItem("permissions");
    setLoginMessage("You have been logged out");
    setLoggedIn(false);
    window.location.replace("/");
  }, []);

  /*
   * Handle redirect in Callback component
   */
  const oidcLogin = (event) => {
    event.preventDefault();
    const url = `${process.env.API_URL}/api/v1.0/auth/login`;
    window.location.replace(url);
  };

  // Memoize the context value
  const value = useMemo(
    () => ({
      token,
      updateToken,
      username,
      updateUsername,
      login,
      oidcLogin,
      logout,
      loginMessage,
      loggedIn,
    }),
    [
      token,
      updateToken,
      username,
      updateUsername,
      login,
      logout,
      loginMessage,
      loggedIn,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {isReady ? children : null}
    </AuthContext.Provider>
  );
}

// Export custom hook
export const useAuth = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return authContext;
};
