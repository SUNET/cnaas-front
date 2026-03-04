import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useState } from "react";
import { createMemoryRouter, RouterProvider, Link } from "react-router";

import { NavigationBlocker } from "./NavigationBlocker";

// @remix-run/router uses the global Request class when completing navigation.
// JSDOM doesn't expose Web API globals like Request, but Node 18+ has them.
// Provide a minimal shim so router.navigate() / blocker.proceed() work in tests.
if (typeof globalThis.Request === "undefined") {
  globalThis.Request = class Request {
    constructor(url, init = {}) {
      this.url = typeof url === "string" ? url : url.toString();
      this.method = (init.method || "GET").toUpperCase();
      this.headers = new (globalThis.Headers || Map)(init.headers || {});
      this.signal = init.signal || new AbortController().signal;
    }
  };
}

/**
 * Test harness that renders NavigationBlocker with a Link to trigger navigation.
 * The `block` prop controls whether blocking starts enabled.
 * A toggle button lets tests enable/disable blocking dynamically.
 */
function BlockerTestPage({ block: initialBlock = true, message }) {
  const [block, setBlock] = useState(initialBlock);
  return (
    <div>
      <NavigationBlocker when={block} message={message} />
      <h1>Test Page</h1>
      <button onClick={() => setBlock((b) => !b)}>Toggle blocking</button>
      <Link to="/other">Go to other page</Link>
    </div>
  );
}

function OtherPage() {
  return <h1>Other Page</h1>;
}

function renderWithRouter({ block = true, message = "Unsaved changes!" } = {}) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        path: "/test",
        element: <BlockerTestPage block={block} message={message} />,
      },
      { path: "/other", element: <OtherPage /> },
    ],
    { initialEntries: ["/test"] },
  );
  render(<RouterProvider router={router} />);
  return { user, router };
}

test("shows confirmation dialog when navigating with blocking enabled", async () => {
  const { user } = renderWithRouter({ message: "You have unsaved changes!" });

  expect(
    screen.getByRole("heading", { name: /test page/i }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: /go to other page/i }));

  expect(screen.getByText("You have unsaved changes!")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /stay on page/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /leave page/i }),
  ).toBeInTheDocument();
});

test("stays on page when clicking cancel", async () => {
  const { user } = renderWithRouter({ message: "Unsaved changes!" });

  await user.click(screen.getByRole("link", { name: /go to other page/i }));

  // Dialog is shown
  expect(screen.getByText("Unsaved changes!")).toBeInTheDocument();

  // Click "Stay on page"
  await user.click(screen.getByRole("button", { name: /stay on page/i }));

  // Dialog is dismissed, still on test page
  expect(screen.queryByText("Unsaved changes!")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /test page/i }),
  ).toBeInTheDocument();
});

test("navigates away when clicking confirm", async () => {
  const { user } = renderWithRouter({ message: "Unsaved changes!" });

  await user.click(screen.getByRole("link", { name: /go to other page/i }));

  // Dialog is shown
  expect(screen.getByText("Unsaved changes!")).toBeInTheDocument();

  // Click "Leave page"
  await user.click(screen.getByRole("button", { name: /leave page/i }));

  // Navigated to other page
  expect(
    screen.getByRole("heading", { name: /other page/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: /test page/i }),
  ).not.toBeInTheDocument();
});

test("does not block navigation when 'when' is false", async () => {
  const { user } = renderWithRouter({ block: false });

  await user.click(screen.getByRole("link", { name: /go to other page/i }));

  // Navigates directly without confirmation
  expect(
    screen.getByRole("heading", { name: /other page/i }),
  ).toBeInTheDocument();
});

test("can toggle blocking on and off dynamically", async () => {
  const { user } = renderWithRouter({ block: false, message: "Are you sure?" });

  // Initially not blocking — enable it
  await user.click(screen.getByRole("button", { name: /toggle blocking/i }));

  // Now try to navigate — should block
  await user.click(screen.getByRole("link", { name: /go to other page/i }));
  expect(screen.getByText("Are you sure?")).toBeInTheDocument();

  // Cancel, then disable blocking
  await user.click(screen.getByRole("button", { name: /stay on page/i }));
  await user.click(screen.getByRole("button", { name: /toggle blocking/i }));

  // Now navigation should succeed without dialog
  await user.click(screen.getByRole("link", { name: /go to other page/i }));
  expect(
    screen.getByRole("heading", { name: /other page/i }),
  ).toBeInTheDocument();
});
