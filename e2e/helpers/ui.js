// @ts-check
/**
 * Shared UI helpers for e2e tests on the Devices page.
 */

/**
 * Click the Actions button of the currently expanded device row.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function openActionsMenu(page) {
  await page.getByRole("button", { name: /actions/i }).click();
}

/**
 * Remove all floating toast notifications from the DOM.
 *
 * Toasts are rendered with `time: 0` (never auto-dismiss) and float in
 * the top-right corner where they can intercept clicks on header buttons
 * like "Search / Filter". Socket.IO events from other tests' fixtures
 * can leave toasts visible across tests; this helper clears them.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function dismissToasts(page) {
  await page.evaluate(() => {
    document.querySelectorAll(".ui-alerts").forEach((el) => {
      el.replaceChildren();
    });
  });
}
