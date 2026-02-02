import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { withRouter } from "react-router";
import { useHistory } from "react-router-dom";

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

function ErrorBoundary({ children }) {
  const history = useHistory();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const unlisten = history.listen(() => {
      if (hasError) {
        setHasError(false);
      }
    });

    // cleanup un unmount
    return () => unlisten();
  }, [history, hasError]);

  return hasError ? <h1>Error</h1> : children;
}

export default withRouter(ErrorBoundary);
