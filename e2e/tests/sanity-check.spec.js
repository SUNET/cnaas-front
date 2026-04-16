// @ts-check
import { test, expect } from "@playwright/test";

test("app loads and shows the dashboard", async ({ page }) => {
  // With pre-baked auth, visiting "/" redirects to /dashboard.
  await page.goto("/");

  // ── Page title ─────────────────────────────────────────────────
  await expect(page).toHaveTitle(/CNaaS NMS/);

  // ── Header navigation links ────────────────────────────────────
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Devices" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();

  // ── Dashboard content (proves the backend API responded) ───────
  await expect(page.getByText("Managed devices:")).toBeVisible({
    timeout: 10000,
  });

  // ── Footer ─────────────────────────────────────────────────────
  await expect(page.getByText("Timezone: UTC")).toBeVisible();
});
