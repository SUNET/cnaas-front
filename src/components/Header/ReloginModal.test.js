import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import ReloginModal from "./ReloginModal";
import { useAuthToken as mockUseAuthToken } from "../../contexts/AuthTokenContext";

jest.mock("../../contexts/AuthTokenContext");

const mockLogout = jest.fn();
const mockOidcLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function renderComponent({ isOpen = true, tokenExpiry = null } = {}) {
  mockUseAuthToken.mockReturnValue({
    logout: mockLogout,
    oidcLogin: mockOidcLogin,
    tokenExpiry,
  });
  return render(<ReloginModal isOpen={isOpen} />);
}

test("shows countdown when token has future expiry", () => {
  const futureExpiry = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
  renderComponent({ tokenExpiry: futureExpiry });

  expect(
    screen.getByText(/your session will time out in/i),
  ).toBeInTheDocument();
});

test("shows expired message when token expiry is in the past", () => {
  const pastExpiry = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
  renderComponent({ tokenExpiry: pastExpiry });

  expect(screen.getByText(/your session has expired/i)).toBeInTheDocument();
});

test("shows does-not-expire message when tokenExpiry is null", () => {
  renderComponent({ tokenExpiry: null });

  expect(screen.getByText(/your session does not expire/i)).toBeInTheDocument();
});

test("is not visible when isOpen is false", () => {
  renderComponent({ isOpen: false });

  expect(screen.queryByText(/session/i)).not.toBeInTheDocument();
});

test("calls logout when user clicks Log out", async () => {
  const user = userEvent.setup();
  renderComponent({ tokenExpiry: null });

  await user.click(screen.getByRole("button", { name: /log out/i }));

  expect(mockLogout).toHaveBeenCalledTimes(1);
});

test("calls logout and oidcLogin when user clicks Log in again", async () => {
  const user = userEvent.setup();
  renderComponent({ tokenExpiry: null });

  await user.click(screen.getByRole("button", { name: /log in again/i }));

  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(mockOidcLogin).toHaveBeenCalledTimes(1);
});
