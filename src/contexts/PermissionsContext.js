import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getData } from "../utils/getData";
import { storeValueIsUndefined } from "../utils/formatters";
import { useAuthToken } from "./AuthTokenContext";

const PermissionsContext = createContext();

// export for test
export const findPermission = (userPermissions, targetPage, requiredRight) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const permission of userPermissions) {
    const { pages, rights } = permission;
    if (
      (pages?.includes("*") || pages?.includes(targetPage)) &&
      (rights?.includes("*") || rights?.includes(requiredRight))
    ) {
      return true;
    }
  }

  return false;
};

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState([]);
  const { token, loggedIn } = useAuthToken();

  const removePermissions = useCallback(() => {
    setPermissions(null);
    localStorage.removeItem("permissions");
  }, []);

  const putPermissions = useCallback(
    (newPermissions) => {
      if (storeValueIsUndefined(newPermissions)) {
        removePermissions();
      } else {
        setPermissions(newPermissions);
        localStorage.setItem("permissions", JSON.stringify(newPermissions));
      }
    },
    [removePermissions],
  );

  const permissionsCheck = useCallback(
    (page, right) => {
      if (process.env.PERMISSIONS_DISABLED === "true") {
        return true;
      }

      return permissions && loggedIn
        ? findPermission(permissions, page, right)
        : false;
    },
    [permissions, loggedIn],
  );

  useEffect(() => {
    const setPermissionsOnLoad = () => {
      const permissionsStored = localStorage.getItem("permissions");
      if (!storeValueIsUndefined(permissionsStored)) {
        setPermissions(JSON.parse(permissionsStored));
      }
    };

    setPermissionsOnLoad();
  }, []);

  // Fetch permissions on token change
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const permissionsStored = localStorage.getItem("permissions");
    if (token && storeValueIsUndefined(permissionsStored)) {
      getData(`${process.env.API_URL}/api/v1.0/auth/permissions`, token, signal)
        .then((data) => {
          if (data) {
            putPermissions(data);
          }
        })
        .catch((error) => {
          console.log("Setting permissions failed with error", error);
        });
    }

    return () => {
      controller.abort("aborting permissions request");
    };
  }, [token, putPermissions]);

  const value = useMemo(
    () => ({ permissions, permissionsCheck, putPermissions }),
    [permissions, permissionsCheck, putPermissions],
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
