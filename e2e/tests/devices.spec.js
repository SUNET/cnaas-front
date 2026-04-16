// @ts-check
import { test, expect } from "@playwright/test";

test("device list shows devices from backend", async ({ page }) => {
  await page.goto("/devices");

  // The two DIST devices are always seeded by the "setup" project (setup.spec.js).
  // eosaccess may or may not exist depending on ZTP state, so we
  // only assert the guaranteed devices here.
  await expect(page.getByRole("cell", { name: "eosdist1" })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("cell", { name: "eosdist2" })).toBeVisible();
});
