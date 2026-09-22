// @ts-check
import { test, expect } from "@playwright/test";
import { JWT_TOKEN, API_BASE } from "../constants.js";
import { openActionsMenu } from "../helpers/ui.js";

test("update facts on a MANAGED device", async ({ page }, testInfo) => {
  await page.goto("/devices");

  // Wait for the seeded DIST device to appear
  await expect(
    page.getByRole("cell", { name: "eosdist1", exact: true }),
  ).toBeVisible({
    timeout: 10000,
  });

  // Expand the eosdist1 row
  const row = page.locator("tr", { hasText: "eosdist1" }).first();
  await row.locator("td").first().click();

  // Open the "Actions" menu and click "Update facts". MUI's Menu portals to
  // document.body, so the menu item is looked up globally, not scoped to
  // the expanded row.
  await openActionsMenu(page);

  const updateFactsOption = page.getByRole("menuitem", {
    name: /update facts/i,
  });
  await expect(updateFactsOption).toBeVisible();
  await updateFactsOption.click();

  await testInfo.attach("after-update-facts", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  // Verify a job was created by polling the API for a device_update_facts job
  await expect(async () => {
    const response = await page.request.get(`${API_BASE}/jobs`, {
      headers: { Authorization: `Bearer ${JWT_TOKEN}` },
      ignoreHTTPSErrors: true,
    });
    const json = await response.json();
    const factJob = json?.data?.jobs?.find(
      (j) => j.function_name === "update_facts" && j.status === "FINISHED",
    );
    expect(factJob).toBeTruthy();
  }).toPass({ timeout: 60000 });
});
