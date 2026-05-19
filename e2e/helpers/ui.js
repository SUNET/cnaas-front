// @ts-check
/**
 * Shared UI helpers for e2e tests on the Devices page.
 *
 * The Actions dropdown lives inside the device's expanded row panel.
 * Many rows are rendered with `hidden={!open}`, so all dropdown triggers
 * exist in the DOM at once — `:visible` picks the one for the currently
 * expanded row.
 */

/**
 * Click the Actions dropdown of the currently expanded device row.
 *
 * Semantic UI renders the trigger as `<div class="ui button dropdown">`,
 * which has no ARIA role we can target. We rely on CSS classes + :visible.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function openActionsMenu(page) {
  await page.locator("div.ui.button.dropdown:visible").click();
}
