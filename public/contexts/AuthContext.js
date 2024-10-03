import React from "react";
import { AuthTokenProvider } from "./AuthTokenContext";
import { PermissionsProvider } from "./PermissionsContext";

function AuthContextProvider({ children }) {
  return (
    <AuthTokenProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </AuthTokenProvider>
  );
}

export default AuthContextProvider;
