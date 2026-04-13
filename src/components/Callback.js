import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { getData } from "../utils/getData";

export function Callback() {
  const [searchParams] = useSearchParams();
  const { token, putToken, setUsername } = useAuthToken();
  const { putPermissions } = usePermissions();

  const hasToken = searchParams.has("token");
  const [errorMessage, setErrorMessage] = useState(
    hasToken ? null : "Something went wrong. Retry the login.",
  );

  useEffect(() => {
    const getPermissions = async (authToken) => {
      if (process.env.PERMISSIONS_DISABLED === "true") {
        window.location.replace("/");
        return;
      }
      try {
        const data = await getData(
          `${process.env.API_URL}/api/v1.0/auth/permissions`,
          authToken,
        );
        putPermissions(data);
        if (data.length > 0) {
          window.location.replace("/");
        } else {
          setErrorMessage(
            "You don't seem to have any permissions within this application. Please check with an admin if this is correct.",
          );
        }
      } catch (e) {
        setErrorMessage(
          "There is an error with collecting the permissions. Please try to reload this page or login again.",
        );
        console.warn(e);
      }
    };

    // Process OIDC redirect params if present
    if (hasToken) {
      if (searchParams.has("username")) {
        setUsername(searchParams.get("username"));
      }
      const newToken = searchParams.get("token");
      putToken(newToken);
      getPermissions(newToken);
      return;
    }

    // No URL params — if already logged in, redirect home
    if (token) {
      window.location.replace("/");
    }
  }, []); // mount-only: runs once on OIDC redirect landing

  if (!errorMessage) return null;

  return <p className="title error">{errorMessage}</p>;
}
