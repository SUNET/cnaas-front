import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Permission } from "../types/permission";
import { storeValueIsUndefined } from "../utils/formatters";
import { getData } from "../utils/getData";
import { sanitizePermissions } from "../utils/permissions/sanitizePermissions";
import { useAuthToken } from "./AuthTokenContext";

export type PermissionsContextValue = {
  permissions: Permission[] | null;
  permissionsCheck: (page: string, right: string) => boolean;
  putPermissions: (newPermissions: Permission[] | null) => void;
};

// export for test
export const findPermission = (
  userPermissions: Permission[],
  targetPage: string,
  requiredRight: string,
): boolean => {
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

const PermissionsContext = createContext<PermissionsContextValue | undefined>(
  undefined,
);

export function PermissionsProvider({
  children,
}: {
  readonly children?: ReactNode;
}) {
  const [permissions, setPermissions] = useState<Permission[] | null>([]);
  const { token, loggedIn } = useAuthToken();

  const removePermissions = useCallback(() => {
    setPermissions(null);
    localStorage.removeItem("permissions");
  }, []);

  const putPermissions = useCallback(
    (newPermissions: Permission[] | null) => {
      // Validate/normalise before trusting or persisting: only known string
      // fields survive, so the value written to storage is freshly constructed
      // rather than the raw (untrusted) API response.
      const sanitized = sanitizePermissions(newPermissions);
      if (storeValueIsUndefined(sanitized)) {
        removePermissions();
      } else {
        setPermissions(sanitized);
        localStorage.setItem("permissions", JSON.stringify(sanitized));
      }
    },
    [removePermissions],
  );

  const permissionsCheck = useCallback(
    (page: string, right: string) => {
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
      if (permissionsStored && !storeValueIsUndefined(permissionsStored)) {
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

  const value = useMemo<PermissionsContextValue>(
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
export const usePermissions = (): PermissionsContextValue => {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }

  return context;
};
