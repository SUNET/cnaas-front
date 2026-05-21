// @ts-check
/**
 * Extra mutation flows for the Devices page.
 *
 * Kept separate from device-list.spec.js so it can be stashed / popped /
 * ported independently. Uses the same serial + per-test cleanup pattern.
 *
 * All tests create their own "eostest-*" devices via the backend API —
 * plain DB rows with no clab container, suitable for exercising metadata
 * mutations that do not need a real device behind them.
 */
import { test, expect } from "@playwright/test";
import {
  createTestDevice,
  deleteTestDeviceIfExists,
  cleanupAllTestDevices,
} from "../helpers/api.js";
import { openActionsMenu } from "../helpers/ui.js";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await cleanupAllTestDevices();
});

test.describe("device mutation actions (extras)", () => {
  test("user changes a device's state from UNMANAGED to MANAGED", async ({
    page,
  }) => {
    const hostname = "eostest-makemanaged";
    await deleteTestDeviceIfExists(hostname);
    await createTestDevice({
      hostname,
      management_ip: "10.99.1.13",
      state: "UNMANAGED",
    });

    try {
      await page.goto("/devices");

      await expect(
        page.getByRole("cell", { name: hostname, exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("cell", { name: hostname, exact: true }).click();
      await openActionsMenu(page);
      await page.getByRole("option", { name: /make managed/i }).click();

      await expect(
        page
          .getByRole("row")
          .filter({
            has: page.getByRole("cell", { name: hostname, exact: true }),
          })
          .getByRole("cell", { name: "MANAGED", exact: true })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestDeviceIfExists(hostname);
    }
  });

  test("user marks an UNMANAGED device for replacement", async ({ page }) => {
    const hostname = "eostest-replace";
    await deleteTestDeviceIfExists(hostname);
    await createTestDevice({
      hostname,
      management_ip: "10.99.1.14",
      state: "UNMANAGED",
    });

    try {
      await page.goto("/devices");

      await expect(
        page.getByRole("cell", { name: hostname, exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("cell", { name: hostname, exact: true }).click();
      await openActionsMenu(page);
      await page.getByRole("option", { name: /replace device/i }).click();

      // For UNMANAGED devices the Replace action triggers a local
      // "UNMANAGED (Replacing)" state change instead of opening a modal.
      await expect(
        page
          .getByRole("row")
          .filter({
            has: page.getByRole("cell", { name: hostname, exact: true }),
          })
          .getByRole("cell", { name: "UNMANAGED (Replacing)", exact: true })
          .first(),
      ).toBeVisible({ timeout: 5_000 });
    } finally {
      await deleteTestDeviceIfExists(hostname);
    }
  });
});
