import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { useAuthToken } from "../../stores/AuthTokenContext";
import { initialAuthTokenState } from "../../stores/authTokenReducer";
import ReloginModal from "./ReloginModal";

jest.mock("../../stores/AuthTokenContext", () => {
  const actual = jest.requireActual("../../stores/AuthTokenContext");
  return {
    ...actual,
    useAuthToken: jest.fn(),
  };
});

const mockUseAuthToken = useAuthToken as jest.MockedFunction<
  typeof useAuthToken
>;
const mockLogout = jest.fn();
const mockOidcLogin = jest.fn();

const authTokenValue = (
  overrides: Partial<ReturnType<typeof useAuthToken>>,
): ReturnType<typeof useAuthToken> => ({
  ...initialAuthTokenState,
  doTokenRefresh: jest.fn(),
  logout: mockLogout,
  oidcLogin: mockOidcLogin,
  putToken: jest.fn(),
  setUsername: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

function renderComponent({
  isOpen = true,
  tokenExpiry = null,
}: { isOpen?: boolean; tokenExpiry?: number | null } = {}) {
  mockUseAuthToken.mockReturnValue(authTokenValue({ tokenExpiry }));
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
