import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { Toaster } from "./Toaster";
import { dismissAllToasts, showToast } from "./toastStore";

afterEach(() => {
  act(() => {
    dismissAllToasts();
  });
});

test("renders nothing when there are no toasts", () => {
  const { container } = render(<Toaster />);

  expect(container).toBeEmptyDOMElement();
});

test("renders a toast's title and message", () => {
  render(<Toaster />);

  act(() => {
    showToast({
      severity: "success",
      title: "Saved",
      message: "All good",
      duration: 0,
    });
  });

  expect(screen.getByText("Saved")).toBeInTheDocument();
  expect(screen.getByText("All good")).toBeInTheDocument();
});

test("renders the newest toast first", () => {
  render(<Toaster />);

  act(() => {
    showToast({ severity: "info", title: "First", duration: 0 });
    showToast({ severity: "info", title: "Second", duration: 0 });
  });

  const alerts = screen.getAllByRole("alert");
  expect(alerts[0]).toHaveTextContent("Second");
  expect(alerts[1]).toHaveTextContent("First");
});

test("dismisses a toast when its close button is clicked", async () => {
  const user = userEvent.setup();
  render(<Toaster />);

  act(() => {
    showToast({ severity: "info", title: "Closable", duration: 0 });
  });
  expect(screen.getByText("Closable")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /close/i }));

  expect(screen.queryByText("Closable")).not.toBeInTheDocument();
});
