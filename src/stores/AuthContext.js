import PropTypes from "prop-types";
import { AuthTokenProvider } from "./AuthTokenContext";
import { PermissionsProvider } from "./PermissionsContext";

AuthContextProvider.propTypes = {
  children: PropTypes.node,
};

function AuthContextProvider({ children }) {
  return (
    <AuthTokenProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </AuthTokenProvider>
  );
}

export default AuthContextProvider;
