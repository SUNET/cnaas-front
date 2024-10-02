import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import checkResponseStatus from "../utils/checkResponseStatus";
import { getData } from "../utils/getData";

export const AuthContext = createContext({});

export function AuthContextProvider({ children }) {
  const [permissions, setPermissions] = useState("");
  const [token, setToken] = useState();
  const [username, setUsername] = useState();
  const [loginMessage, setLoginMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  /*
   * Tries to fetch token on mount.
   */
  useEffect(() => {
    const setAuthStateOnLoad = async () => {
      const usernameStored = localStorage.getItem("username");
      const tokenStored = localStorage.getItem("token");
      const permissionsStored = localStorage.getItem("permissions");
      setToken(tokenStored);
      setUsername(usernameStored);
      setPermissions(permissionsStored);
      if (tokenStored) {
        setLoggedIn(true);
      }
    };

    setAuthStateOnLoad();
    setIsReady(true);
  }, []);

  const updatePermissions = useCallback((newPermissions) => {
    setPermissions(newPermissions);
    localStorage.setItem("permissions", newPermissions);
  }, []);

  const removePermissions = () => {
    setPermissions(null);
    localStorage.removeItem("permissions");
  };

  /*
   * Set permissions on token change
   */
  useEffect(() => {
    if (token) {
      getData(`${process.env.API_URL}/api/v1.0/auth/permissions`, token)
        .then((data) => {
          if (data) {
            updatePermissions(JSON.stringify(data));
          }
        })
        .catch((error) => {
          console.log(error);
          return false;
        });
    } else {
      removePermissions();
    }
  }, [updatePermissions, token]);

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
    removePermissions();
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

  const value = useMemo(
    () => ({
      token,
      updateToken,
      username,
      updateUsername,
      permissions,
      updatePermissions,
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
      permissions,
      updatePermissions,
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
