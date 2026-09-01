import { Component, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Container from "@mui/material/Container";
import { Outlet, useLocation } from "react-router";

type ErrorBoundaryState = {
  readonly error: Error | null;
};

/**
 * Catches render errors in the subtree and shows a fallback instead of a
 * blank screen. Error boundaries must be class components in React.
 */
class ErrorBoundaryInner extends Component<
  {
    /** Changing this value resets the boundary (e.g. on route change). */
    readonly resetKey?: string;
    /** Content to guard. Defaults to the router <Outlet /> when used as a layout route. */
    readonly children?: ReactNode;
  },
  ErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  state: ErrorBoundaryState = { error: null };

  componentDidUpdate(prevProps: { readonly resetKey?: string }): void {
    const { error } = this.state;
    const { resetKey } = this.props;
    if (error && prevProps.resetKey !== resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    console.error("Uncaught error in render:", error, info.componentStack);
  }

  handleReload = (): void => {
    globalThis.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children } = this.props;

    if (error) {
      return (
        <Container maxWidth="sm" style={{ marginTop: "2em" }}>
          <Alert severity="error">
            <AlertTitle>Something went wrong</AlertTitle>
            <p>{error.message}</p>
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleReload}
          >
            Reload page
          </Button>
        </Container>
      );
    }

    return children ?? <Outlet />;
  }
}

/**
 * Router-friendly wrapper that resets the boundary whenever the route
 * changes, so navigating away from a broken page clears the error.
 */
export function ErrorBoundary({ children }: { readonly children?: ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundaryInner resetKey={location.pathname}>
      {children}
    </ErrorBoundaryInner>
  );
}
