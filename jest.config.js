/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
    DashboardLinkgrid$: "<rootDir>/__mocks__/DashboardLinkgrid.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
};

module.exports = config;
