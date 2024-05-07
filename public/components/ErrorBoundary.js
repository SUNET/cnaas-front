import React from "react";
import { withRouter } from "react-router";

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  componentDidMount() {
    this.unlisten = this.props.history.listen((location, action) => {
      if (this.state.hasError) {
        this.setState({ hasError: false });
      }
    });
  }

  componentWillUnmount() {
    this.unlisten();
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Error</h1>;
    }
    return this.props.children;
  }
}

export default withRouter(ErrorBoundary);
