import React, { useCallback, useEffect, useState } from "react";
import { Container } from "semantic-ui-react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { usePermissions } from "../contexts/PermissionsContext";
import "../styles/reset.css";
import "../styles/main.css";

import { getData } from "../utils/getData";

function Callback() {
  const [infoMessage, setInfoMessage] = useState(
    "Please be patient, you will be logged in.",
  );

  const { putToken, putUsername } = useAuthToken();
  const { permissions, putPermissions } = usePermissions();

  const checkSuccess = useCallback(() => {
    if (
      (permissions || process.env.PERMISSIONS_DISABLED === "true") &&
      Object.hasOwn(localStorage, "token")
    ) {
      setInfoMessage(
        "Everything is loaded, you should be sent to the homepage in a second.",
      );
      window.location.replace("/");
      return true;
    }
    return false;
  }, [permissions]);

  useEffect(() => {
    const getPermissions = (token) => {
      if (process.env.PERMISSIONS_DISABLED === "true") {
        checkSuccess();
      } else {
        getData(`${process.env.API_URL}/api/v1.0/auth/permissions`, token)
          .then((data) => {
            putPermissions(data);
            setInfoMessage("Permissions are retrieved.");
            checkSuccess();
          })
          .catch((e) => {
            setInfoMessage(
              "There is an error with collecting the permissions. Please try to reload this page or login again.",
            );
            console.log(e);
          });
      }
    };

    if (Object.hasOwn(localStorage, "token") && checkSuccess()) {
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.has("refresh_token")) {
      document.cookie = `REFRESH_TOKEN=${params.get(
        "refresh_token",
      )}; SameSite=None; Secure; HttpOnly; Path=/api/v1.0/auth/refresh`;
    }
    if (params.has("username")) {
      putUsername(params.get("username"));
    }
    if (params.has("token")) {
      // Add the token as a parameter in local storage and communicate with the user they are logged in
      // We don't check the validity of the token as this is done with every API call to get any information
      const token = params.get("token");
      putToken(token);
      getPermissions(token);
      setInfoMessage("You're logged in.");
      window.location.replace("/");
    } else {
      setInfoMessage("Something went wrong. Retry the login.");
    }
  }, [putToken, putUsername, putPermissions, checkSuccess]);

  return (
    <div className="container">
      <Container>
        <p className="title error">{infoMessage}</p>
      </Container>
    </div>
  );
}

export default Callback;
