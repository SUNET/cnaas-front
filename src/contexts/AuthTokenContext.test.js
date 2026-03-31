import "@testing-library/jest-dom";
import { getSecondsUntilExpiry } from "./AuthTokenContext";

describe("getSecondsUntilExpiry", () => {
  test("returns positive seconds for future expiry", () => {
    const futureExpiry = Math.round(Date.now() / 1000) + 600;
    const result = getSecondsUntilExpiry(futureExpiry);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(600);
  });

  test("returns 0 for past expiry", () => {
    const pastExpiry = Math.round(Date.now() / 1000) - 60;
    expect(getSecondsUntilExpiry(pastExpiry)).toBe(0);
  });

  test("returns null when tokenExpiry is null", () => {
    expect(getSecondsUntilExpiry(null)).toBeNull();
  });

  test("returns null when tokenExpiry is undefined", () => {
    expect(getSecondsUntilExpiry(undefined)).toBeNull();
  });
});
