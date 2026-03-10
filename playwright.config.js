// @ts-check
const { defineConfig, devices } = require("@playwright/test");
const path = require("node:path");

/**
 * Load .env.e2e so that environment variables are available in this config.
 * Parcel itself picks up .env.e2e via NODE_ENV=e2e (set in webServer.command below).
 */
process.loadEnvFile(path.resolve(__dirname, ".env.e2e"));

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:1234",

    /* The backend uses a self-signed certificate */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /* Seed the backend with DIST devices + management domain before tests run. */
    {
      name: "setup",
      testMatch: /setup\.spec\.js/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /setup\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
        // Allow in-page fetch() to self-signed https://localhost backend
        launchOptions: {
          args: ["--ignore-certificate-errors"],
        },
      },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      testIgnore: [/setup\.spec/, /ztp-init/],
      use: {
        ...devices["Desktop Firefox"],
        storageState: "playwright/.auth/user.json",
      },
    },
    {
      name: "webkit",
      dependencies: ["setup"],
      testIgnore: [/setup\.spec/, /ztp-init/],
      use: {
        ...devices["Desktop Safari"],
        storageState: "playwright/.auth/user.json",
      },
    },
  ],

  /* Run your local dev server before starting the tests.
   * NODE_ENV=e2e tells Parcel to load .env.e2e as overrides on top of .env.
   */
  webServer: {
    command: "NODE_ENV=e2e npm run start",
    url: "http://localhost:1234",
    reuseExistingServer: !process.env.CI,
  },
});
