import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router";

import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("Kaboom");
}

function SafePage() {
  return <h1>Safe page</h1>;
}

function renderWithRouter(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        element: <ErrorBoundary />,
        children: [
          { path: "/boom", element: <Boom /> },
          { path: "/safe", element: <SafePage /> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  return render(<RouterProvider router={router} />);
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  // React logs caught errors to console.error; silence the expected noise.
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

test("renders children when no error is thrown", () => {
  renderWithRouter("/safe");
  expect(
    screen.getByRole("heading", { name: /safe page/i }),
  ).toBeInTheDocument();
});

test("renders the fallback when a child throws during render", () => {
  renderWithRouter("/boom");
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  expect(screen.getByText("Kaboom")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /reload page/i }),
  ).toBeInTheDocument();
});

test("used as a plain wrapper renders its children", () => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        ),
        children: [{ index: true, element: <SafePage /> }],
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  expect(
    screen.getByRole("heading", { name: /safe page/i }),
  ).toBeInTheDocument();
});
