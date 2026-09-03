// @ts-check
/**
 * E2E user stories for the Devices page.
 *
 * Read-only tests rely on devices seeded by the "setup" project
 * (eosdist1, eosdist2). Mutation tests create their own "eostest-*"
 * devices via the backend API — plain DB rows with no clab container
 * behind them, which lets us exercise metadata flows (rename, state
 * change, delete) without touching real hardware.
 *
 * The whole file runs serially. Tests in different files still run in
 * parallel via separate worker processes; what we avoid here is two
 * mutation tests racing on the shared device table and triggering
 * stale-data refresh errors in the UI.
 *
 * Cleanup: each mutation test deletes its fixture in a `finally`. There
 * is no global afterAll cleanup — serial + per-test cleanup is enough,
 * and a worker-level afterAll could otherwise wipe fixtures still in use
 * by tests running in other worker processes.
 */
import { test, expect } from "@playwright/test";
import {
  createTestDevice,
  deleteTestDeviceIfExists,
  cleanupAllTestDevices,
} from "../helpers/api.js";
import { openActionsMenu, dismissToasts } from "../helpers/ui.js";

test.describe.configure({ mode: "serial" });

// In serial mode only one worker runs this file, so it is safe to wipe
// every leftover "eostest-*" device once at the start.
test.beforeAll(async () => {
  await cleanupAllTestDevices();
});

test("user finds a device by filtering on device type", async ({ page }) => {
  await page.goto("/devices");

  await expect(
    page.getByRole("cell", { name: "eosdist1", exact: true }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("cell", { name: "eosdist2", exact: true }).first(),
  ).toBeVisible();

  // open the filter row and pick Device type = DIST
  await dismissToasts(page);
  await page.getByRole("button", { name: "Search / Filter" }).click();
  await page
    .getByRole("columnheader")
    .filter({ has: page.getByRole("listbox") })
    .first()
    .getByRole("listbox")
    .click();
  await page.getByRole("option", { name: "DIST", exact: true }).click();

  // both DIST devices remain visible
  await expect(
    page.getByRole("cell", { name: "eosdist1", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "eosdist2", exact: true }).first(),
  ).toBeVisible();
});

test("user adds an extra column to see more device details", async ({
  page,
}) => {
  await page.goto("/devices");

  await expect(
    page.getByRole("columnheader", { name: "Hostname" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /Management IP/i }),
  ).toBeHidden();

  // open the column selector and add Management IP
  await dismissToasts(page);
  await page.getByRole("button", { name: "Select Columns" }).click();
  const managementIpCheckbox = page.getByRole("checkbox", {
    name: /Management IP/i,
  });
  await managementIpCheckbox.check();
  // Close the column chooser popover so it no longer overlays the table.
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("columnheader", { name: /Management IP/i }),
  ).toBeVisible();

  // remove it again so the test leaves no trace
  await page.getByRole("button", { name: /Select Columns/ }).click();
  await managementIpCheckbox.uncheck();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("columnheader", { name: /Management IP/i }),
  ).toBeHidden();
});

test("user opens the rename dialog, validates the form, and cancels", async ({
  page,
}) => {
  await page.goto("/devices");

  // expand eosdist1 and open its Actions menu
  await page.getByRole("cell", { name: "eosdist1", exact: true }).click();
  await openActionsMenu(page);
  await page.getByRole("option", { name: /change hostname/i }).click();

  await expect(page.getByText("Change hostname for eosdist1")).toBeVisible();

  // submit is disabled until a valid new hostname is typed
  const submit = page.getByRole("button", { name: /Change hostname/ });
  await expect(submit).toBeDisabled();

  const input = page.getByPlaceholder("new hostname...");

  // same hostname is invalid
  await input.fill("eosdist1");
  await expect(submit).toBeDisabled();

  // a different hostname enables submit
  await input.fill("eosdist1-new");
  await expect(submit).toBeEnabled();

  // cancel — original row should be unchanged
  // (the expanded info block also contains a cell with "eosdist1", so we
  //  use .first() to target the row cell, not the detail-table cell.)
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Change hostname for eosdist1")).toBeHidden();
  await expect(
    page.getByRole("cell", { name: "eosdist1", exact: true }).first(),
  ).toBeVisible();
});

test.describe("device mutations", () => {
  test("user renames a device via the Actions menu", async ({ page }) => {
    const original = "eostest-rename";
    const renamed = "eostest-rename-new";
    await deleteTestDeviceIfExists(original);
    await deleteTestDeviceIfExists(renamed);
    await createTestDevice({
      hostname: original,
      management_ip: "10.99.1.10",
      state: "UNMANAGED", // skip the MANAGED settings-equality check
    });

    try {
      await page.goto("/devices");

      // find the new device and open its Actions menu
      await expect(
        page.getByRole("cell", { name: original, exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("cell", { name: original, exact: true }).click();
      await openActionsMenu(page);
      await page.getByRole("option", { name: /change hostname/i }).click();

      // fill in new hostname and submit
      await page.getByPlaceholder("new hostname...").fill(renamed);
      await page.getByRole("button", { name: "Change hostname" }).click();

      // row updates — old hostname gone, new one visible
      await expect(
        page.getByRole("cell", { name: renamed, exact: true }).first(),
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole("cell", { name: original, exact: true }),
      ).toBeHidden();
    } finally {
      await deleteTestDeviceIfExists(original);
      await deleteTestDeviceIfExists(renamed);
    }
  });

  test("user changes a device's state from MANAGED to UNMANAGED", async ({
    page,
  }) => {
    const hostname = "eostest-state";
    await deleteTestDeviceIfExists(hostname);
    await createTestDevice({
      hostname,
      management_ip: "10.99.1.11",
      state: "MANAGED",
    });

    try {
      await page.goto("/devices");

      await expect(
        page.getByRole("cell", { name: hostname, exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("cell", { name: hostname, exact: true }).click();
      await openActionsMenu(page);
      await page.getByRole("option", { name: /make unmanaged/i }).click();

      // state cell on the device's row flips to UNMANAGED
      await expect(
        page
          .getByRole("row")
          .filter({
            has: page.getByRole("cell", { name: hostname, exact: true }),
          })
          .getByRole("cell", { name: "UNMANAGED", exact: true })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestDeviceIfExists(hostname);
    }
  });

  test("user deletes a device via the Delete dialog", async ({ page }) => {
    const hostname = "eostest-delete";
    await deleteTestDeviceIfExists(hostname);
    await createTestDevice({
      hostname,
      management_ip: "10.99.1.12",
      state: "UNMANAGED",
    });

    try {
      await page.goto("/devices");

      await expect(
        page.getByRole("cell", { name: hostname, exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("cell", { name: hostname, exact: true }).click();
      await openActionsMenu(page);
      await page.getByRole("option", { name: /delete device/i }).click();

      // confirm by typing the hostname, then click Delete
      // (the modal also has a descriptive paragraph containing the same text,
      //  so use .first() to target the header.)
      await expect(
        page.getByText(`Delete device ${hostname}`).first(),
      ).toBeVisible();
      await page.getByPlaceholder("confirm hostname").fill(hostname);
      await page.getByRole("button", { name: "Delete" }).click();

      // device row remains visible with state "DELETED"
      await expect(
        page
          .getByRole("row")
          .filter({
            has: page.getByRole("cell", { name: hostname, exact: true }),
          })
          .getByRole("cell", { name: "DELETED", exact: true })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestDeviceIfExists(hostname);
    }
  });
});
