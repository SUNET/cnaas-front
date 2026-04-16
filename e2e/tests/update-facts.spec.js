// @ts-check
import { test, expect } from "@playwright/test";
import { JWT_TOKEN, API_BASE } from "../constants.js";

test("update facts on a MANAGED device", async ({ page }, testInfo) => {
  await page.goto("/devices");

  // Wait for the seeded DIST device to appear
  await expect(page.getByRole("cell", { name: "eosdist1" })).toBeVisible({
    timeout: 10000,
  });

  // Expand the eosdist1 row
  const row = page.locator("tr", { hasText: "eosdist1" });
  const expandButton = row.locator("td").first();
  await expandButton.click();

  // Open the "Actions" dropdown and click "Update facts"
  const actionsDropdown = page.locator(".ui.button.dropdown", {
    hasText: "Actions",
  });
  await expect(actionsDropdown).toBeVisible({ timeout: 5000 });
  await actionsDropdown.click();

  const updateFactsOption = page.locator(".menu .item", {
    hasText: "Update facts",
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
