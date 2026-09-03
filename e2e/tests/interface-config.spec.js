// @ts-check
import { test, expect } from "@playwright/test";

test.describe("Interface config page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to devices page and click the plug icon for eosaccess
    await page.goto("/devices");
    await expect(
      page.getByRole("cell", { name: "eosaccess", exact: true }),
    ).toBeVisible({
      timeout: 15000,
    });

    const eosaccessRow = page.locator("tr", { hasText: "eosaccess" });
    // The interface-config link is icon-only; target it by its stable href.
    await eosaccessRow
      .locator('a[href*="interface-config?hostname=eosaccess"]')
      .click();

    await expect(page).toHaveURL(/\/interface-config\?hostname=eosaccess/);
    await expect(page.getByText("Interface configuration")).toBeVisible({
      timeout: 15000,
    });
  });

  test("loads device info and interface table", async ({ page }) => {
    // Device info table shows hostname
    const deviceDetails = page.getByText("Device details");
    await deviceDetails.click();
    await expect(page.getByText("eosaccess")).toBeVisible();

    // "Configtype" column proves this is an ACCESS device (DIST shows "Interface class")
    await expect(
      page.getByRole("columnheader", { name: "Configtype" }),
    ).toBeVisible({ timeout: 10000 });

    // Sync state indicator is present
    await expect(page.getByText("Sync state:")).toBeVisible();

    // Interface table has header columns
    await expect(
      page.getByRole("columnheader", { name: "Name" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Description" }),
    ).toBeVisible();

    // At least one description input exists (proves interfaces loaded)
    const descriptionInput = page.locator('input[name^="description|"]');
    await expect(descriptionInput.first()).toBeVisible({ timeout: 10000 });
    const inputCount = await descriptionInput.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test("column visibility toggle", async ({ page }) => {
    // Wait for interface table to load
    await expect(
      page.locator('input[name^="description|"]').first(),
    ).toBeVisible({ timeout: 10000 });

    // Open the column selector popup
    const columnButton = page.locator('button[title="Select Columns"]');
    await columnButton.click();

    // "VLANs" checkbox should be visible in the popup
    const vlansCheckbox = page.getByRole("checkbox", { name: "VLANs" });
    await expect(vlansCheckbox).toBeVisible();

    // Check current state — VLANs may or may not be visible by default
    const vlansHeader = page.getByRole("columnheader", { name: "VLANs" });
    const vlansVisible = await vlansHeader.isVisible();

    // Toggle the checkbox to the opposite state, then close the popover so it
    // no longer overlays the table.
    if (vlansVisible) {
      await vlansCheckbox.uncheck();
      await page.keyboard.press("Escape");
      await expect(vlansHeader).not.toBeVisible();
    } else {
      await vlansCheckbox.check();
      await page.keyboard.press("Escape");
      await expect(vlansHeader).toBeVisible();
    }

    // Toggle back to restore original state
    await columnButton.click();
    if (vlansVisible) {
      await vlansCheckbox.check();
      await page.keyboard.press("Escape");
      await expect(vlansHeader).toBeVisible();
    } else {
      await vlansCheckbox.uncheck();
      await page.keyboard.press("Escape");
      await expect(vlansHeader).not.toBeVisible();
    }
  });

  test("save and commit ACCESS device description change", async ({
    page,
  }, testInfo) => {
    // Find a description input and note which interface it belongs to
    const descriptionInput = page
      .locator('input[name^="description|"]')
      .first();
    await expect(descriptionInput).toBeVisible({ timeout: 10000 });
    const inputName = await descriptionInput.getAttribute("name");
    expect(inputName).not.toBeNull();
    const interfaceName = /** @type {string} */ (inputName).replace(
      "description|",
      "",
    );

    // Edit the description
    await descriptionInput.fill("e2e-committed");

    await testInfo.attach("before-commit", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // Open save modal
    const saveButton = page.getByRole("button", {
      name: "Save & commit...",
    });
    await saveButton.click();

    const modal = page.locator(".ui.modal.visible.active");
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText("Save & commit")).toBeVisible();

    await testInfo.attach("commit-modal", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // Click "Save and dry run..." (works even when device is unsynchronized)
    await modal.getByRole("button", { name: "Save and dry run..." }).click();

    // Should navigate to config-change page
    await expect(page).toHaveURL(/\/config-change/, { timeout: 10000 });
    await expect(page).toHaveURL(/hostname=eosaccess/);

    await testInfo.attach("config-change-page", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // Navigate back to interface config and verify the description persisted
    await page.goto("/interface-config?hostname=eosaccess");
    await expect(page.getByText("Interface configuration")).toBeVisible({
      timeout: 15000,
    });

    const persistedInput = page.locator(
      `input[name="description|${interfaceName}"]`,
    );
    await expect(persistedInput).toHaveValue("e2e-committed", {
      timeout: 10000,
    });

    await testInfo.attach("after-reload", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
