// @ts-check
/**
 * Read-only and non-destructive flows for the Devices page.
 *
 * These tests are safe to run in parallel: they either only read state
 * (Show config), navigate away (Sync device, Configure ports), filter the
 * page (Uplink), or open a modal that we close without saving (Management
 * domain). The seeded DIST/ACCESS devices are not mutated.
 *
 * Kept separate from device-list.spec.js so the file can be stashed /
 * popped / ported independently.
 */
import { test, expect } from "@playwright/test";
import { openActionsMenu } from "../helpers/ui.js";

/**
 * Expand a device row by clicking on its hostname cell.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} hostname
 */
async function expandDeviceRow(page, hostname) {
  await expect(
    page.getByRole("cell", { name: hostname, exact: true }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("cell", { name: hostname, exact: true }).first().click();
}

test.describe("Show configuration", () => {
  test("user views both running and generated config for a MANAGED device", async ({
    page,
  }) => {
    const hostname = "eosdist1";

    await page.goto("/devices");
    await expandDeviceRow(page, hostname);
    await openActionsMenu(page);
    await page.getByRole("option", { name: /show configuration/i }).click();

    await expect(page.getByText(`Show config for ${hostname}`)).toBeVisible({
      timeout: 15_000,
    });

    // Two columns load distinct content from different sources.
    await expect(
      page.getByRole("heading", { name: "Device running config" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "NMS generated config" }),
    ).toBeVisible();

    // Both panes contain the hostname (proves real content loaded).
    await expect(
      page.locator("pre.fullconfig", { hasText: hostname }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator("pre.fullconfig", { hasText: hostname }).nth(1),
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Navigation actions", () => {
  test("user clicks Sync device and is navigated to the Config change page", async ({
    page,
  }) => {
    const hostname = "eosdist1";

    await page.goto("/devices");
    await expandDeviceRow(page, hostname);
    await openActionsMenu(page);
    await page.getByRole("option", { name: /sync device/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`/config-change\\?hostname=${hostname}$`),
    );
  });

  test("Configure ports action is available for MANAGED ACCESS devices", async ({
    page,
  }) => {
    const hostname = "eosaccess";

    await page.goto("/devices");
    await expandDeviceRow(page, hostname);
    await openActionsMenu(page);

    await expect(
      page.getByRole("option", { name: /configure ports/i }),
    ).toBeVisible();
  });
});

test.describe("Management IP affordances", () => {
  test("user copies the management IP to the clipboard", async ({ page }) => {
    const hostname = "eosaccess";
    const expectedIp = "10.0.6.6";

    await page.goto("/devices");

    // Stub the clipboard write before the user interacts. Firefox does not
    // grant clipboard read permission in Playwright by default, so we
    // capture the value passed to writeText instead of reading it back.
    await page.addInitScript(() => {
      const calls = [];
      Object.defineProperty(globalThis, "__clipboardWrites", {
        value: calls,
        writable: false,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            calls.push(text);
          },
        },
      });
    });
    await page.reload();

    await expandDeviceRow(page, hostname);

    // Semantic UI renders icon-only buttons with the `title` attribute as
    // their accessible name. exact:true disambiguates the copy button
    // (title=ip) from the ssh button (title=ssh://ip).
    await page.getByRole("button", { name: expectedIp, exact: true }).click();

    const writes = await page.evaluate(() => globalThis.__clipboardWrites);
    expect(writes).toContain(expectedIp);
  });

  test("SSH console button uses the ssh:// protocol", async ({ page }) => {
    const hostname = "eosaccess";
    const expectedIp = "10.0.6.6";
    const expectedSshAddress = `ssh://${expectedIp}`;

    await page.goto("/devices");
    await expandDeviceRow(page, hostname);

    // The button does not open a popup; clicking it sets globalThis.location
    // to the ssh:// URL, which the OS would normally hand to an external
    // SSH client. We don't click — just verify the affordance is wired up
    // correctly via the accessible name (Semantic UI's title attribute).
    await expect(
      page.getByRole("button", { name: expectedSshAddress }),
    ).toBeVisible();
  });
});

test.describe("Inline row affordances", () => {
  test("user clicks an uplink button to filter to the neighbor device", async ({
    page,
  }) => {
    const accessDevice = "eosaccess";
    const uplinkNeighbor = "eosdist1";

    await page.goto("/devices");
    await expandDeviceRow(page, accessDevice);

    await page
      .getByRole("button", {
        name: new RegExp(`Uplink to ${uplinkNeighbor}`),
      })
      .first()
      .click();

    // The URL is updated with a hostname filter for the neighbor device.
    await expect(page).toHaveURL(
      new RegExp(`filter%5Bhostname%5D=${uplinkNeighbor}`),
    );
    await expect(
      page.getByRole("cell", { name: uplinkNeighbor, exact: true }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("user opens the Management domain modal for a DIST device", async ({
    page,
  }) => {
    const distDevice = "eosdist2";

    await page.goto("/devices");
    await expandDeviceRow(page, distDevice);

    await page
      .getByRole("button", { name: "Management domain" })
      .first()
      .click();

    // Semantic UI Modal.Header renders as <div class="header">, not an ARIA
    // heading, so we match by text. The modal title includes the mgmt
    // domain id (assigned by backend at seed).
    await expect(page.getByText(/^Management domain \d+$/)).toBeVisible({
      timeout: 5_000,
    });

    // The expected gateway and devices are displayed.
    await expect(page.getByText(/Devices in managament domain:/)).toBeVisible();
    await expect(page.locator('input[value="10.0.6.1/24"]')).toBeVisible();

    // Cancel without saving.
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
