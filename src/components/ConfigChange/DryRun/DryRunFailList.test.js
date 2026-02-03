import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DryRunFailList } from "./DryRunFailList";

function renderComponent(props = {}) {
  const defaultProps = {
    devices: {},
  };
  return render(<DryRunFailList {...defaultProps} {...props} />);
}

test("displays failed device names and not devices that have not failed", () => {
  const devices = {
    "switch-01": { failed: true },
    "switch-02": { failed: false },
    "router-01": { failed: true },
  };

  renderComponent({ devices });

  expect(screen.getByText("switch-01")).toBeInTheDocument();
  expect(screen.queryByText("switch-02")).not.toBeInTheDocument();
  expect(screen.getByText("router-01")).toBeInTheDocument();
});

test("displays nothing when no devices have failed", () => {
  const devices = {
    "switch-01": { failed: false },
    "switch-02": { failed: false },
  };

  renderComponent({ devices });

  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});

test("displays nothing when devices object is empty", () => {
  renderComponent({ devices: {} });

  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});
