require("dotenv").config({ path: ".env.test" });

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

// Global mock for react-router-dom useHistory
const mockHistoryPush = jest.fn();
jest.mock("react-router-dom/cjs/react-router-dom.min", () => ({
  ...jest.requireActual("react-router-dom"),
  useHistory: () => ({ push: mockHistoryPush }),
}));

// Export mockHistoryPush for tests to access and assert
globalThis.mockHistoryPush = mockHistoryPush;

// Clear mocks between tests
beforeEach(() => {
  mockHistoryPush.mockClear();
});
