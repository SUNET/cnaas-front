import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getData } from "../utils/getData";
import { useAuthToken } from "./AuthTokenContext";

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState([]);
  const { token } = useAuthToken();

  useEffect(() => {
    const setPermissionsOnLoad = async () => {
      const permissionsStored = localStorage.getItem("permissions");
      setPermissions(permissionsStored);
    };

    setPermissionsOnLoad();
  }, []);

  const putPermissions = useCallback((newPermissions) => {
    setPermissions(newPermissions);
    localStorage.setItem("permissions", newPermissions);
  }, []);

  const clearPermissions = useCallback(() => {
    setPermissions([]);
    localStorage.removeItem("permissions");
  }, []);

  // Fetch permissions on token change
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    if (!token) {
      clearPermissions();
    } else {
      getData(`${process.env.API_URL}/api/v1.0/auth/permissions`, token, signal)
        .then((data) => {
          if (data) {
            putPermissions(JSON.stringify(data));
          }
        })
        .catch((error) => {
          if (error.name === "AbortError") {
            console.log("cancelled permissions request");
            return false;
          }
          console.log(error);
          return false;
        });
    }

    return () => {
      controller.abort();
    };
  }, [token, putPermissions, clearPermissions]);

  const value = useMemo(
    () => ({ permissions, putPermissions, clearPermissions }),
    [permissions, putPermissions, clearPermissions],
  );
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// Export custom hook for using PermissionsContext
export const usePermissions = () => {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }

  return context;
};
