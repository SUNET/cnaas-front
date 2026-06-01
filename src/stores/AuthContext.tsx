import { ReactNode } from "react";
import { AuthTokenProvider } from "./AuthTokenContext";
import { PermissionsProvider } from "./PermissionsContext";

function AuthContextProvider({ children }: { readonly children?: ReactNode }) {
  return (
    <AuthTokenProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </AuthTokenProvider>
  );
}

export default AuthContextProvider;
