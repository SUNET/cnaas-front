require("dotenv").config({ path: ".env.test" });

// jsdom does not expose Node's TextEncoder/TextDecoder globals.
// React Router v7 requires them, so we polyfill here.
const { TextEncoder, TextDecoder } = require("util");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

// From: https://stackoverflow.com/a/41434763
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

globalThis.localStorage = new LocalStorageMock();

// Global mock for react-router useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

// Export mockNavigate for tests to access and assert
globalThis.mockNavigate = mockNavigate;

// Clear mocks between tests
beforeEach(() => {
  mockNavigate.mockClear();
});
