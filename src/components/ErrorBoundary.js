import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export function ErrorBoundary({ children }) {
  const location = useLocation();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
  }, [location, hasError]);

  return hasError ? <h1>Error</h1> : (children ?? <Outlet />);
}
