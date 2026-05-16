import { test, expect } from "@playwright/test";

/**
 * E2E user stories for the Devices page.
 *
 * Preconditions (handled by the "setup" project + a prior `e2e:ztp` run):
 *   - eosdist1, eosdist2  — MANAGED DIST
 *   - eosaccess           — MANAGED ACCESS (initialized by ztp-init.spec.js)
 */

test("@ztp user finds the access switch by filtering and inspects it", async ({
  page,
}) => {
  await page.goto("/devices");

  // all 3 seeded devices in the table
  await expect(
    page.getByRole("cell", { name: "eosdist1", exact: true }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("cell", { name: "eosdist2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "eosaccess", exact: true }),
  ).toBeVisible();

  // enable the filter row and pick Device type = ACCESS
  await page.getByRole("button", { name: "Search / Filter" }).click();
  await page
    .getByRole("columnheader")
    .filter({ has: page.getByRole("listbox") })
    .first()
    .getByRole("listbox")
    .click();
  await page.getByRole("option", { name: "ACCESS", exact: true }).click();

  // only eosaccess remains
  await expect(
    page.getByRole("cell", { name: "eosaccess", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "eosdist1", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("cell", { name: "eosdist2", exact: true }),
  ).toBeHidden();

  // open eosaccess to inspect it
  // (The hostname cell holds a navigation link, so click another cell.)
  await page.getByRole("cell", { name: "ACCESS", exact: true }).click();

  // the device's Actions menu
  await expect(page.getByText("Actions")).toBeVisible();
});

test("user adds an extra column to see more device details", async ({
  page,
}) => {
  await page.goto("/devices");

  // default columns; Management IP is not shown
  await expect(
    page.getByRole("columnheader", { name: "Hostname" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Management IP" }),
  ).toBeHidden();

  // open the column selector and add Management IP
  await page.getByRole("button", { name: "Select Columns" }).click();
  const managementIpLabel = page
    .getByRole("listitem")
    .filter({ hasText: "Management IP" })
    .getByText("Management IP");
  await managementIpLabel.click();

  // Management IP column is now shown
  await expect(
    page.getByRole("columnheader", { name: "Management IP" }),
  ).toBeVisible();

  // remove it again so the test leaves no trace
  await managementIpLabel.click();
  await expect(
    page.getByRole("columnheader", { name: "Management IP" }),
  ).toBeHidden();
});

test("user opens a rename dialog, validates the form, and cancels", async ({
  page,
}) => {
  await page.goto("/devices");

  // expand eosdist1 and open its Actions menu
  // (every row pre-renders a hidden expanded section, so scope to the
  // visible Actions button)
  await page.getByRole("cell", { name: "eosdist1", exact: true }).click();
  await page
    .getByRole("button", { name: "Actions" })
    .filter({ visible: true })
    .click();
  await page.getByRole("option", { name: /change hostname/i }).click();

  // rename form for eosdist1
  await expect(page.getByText("Change hostname for eosdist1")).toBeVisible();

  // submit is disabled until a valid new hostname is typed
  const submit = page.getByRole("button", { name: "Change hostname" });
  await expect(submit).toBeDisabled();

  const input = page.getByPlaceholder("new hostname...");

  // type the same hostname (still invalid)
  await input.fill("eosdist1");
  await expect(submit).toBeDisabled();

  // type a different hostname
  await input.fill("eosdist1-new");
  await expect(submit).toBeEnabled();

  // cancel
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Change hostname for eosdist1")).toBeHidden();

  // original eosdist1 row unchanged
  // (the expanded DeviceInfoTable also contains "eosdist1", so anchor on
  // the row that starts with the device id "1")
  await expect(page.getByRole("row", { name: /^1 eosdist1 / })).toBeVisible();
});
