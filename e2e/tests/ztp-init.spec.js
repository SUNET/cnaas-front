// @ts-check
import { test, expect } from "@playwright/test";
import { JWT_TOKEN, API_BASE } from "../constants.js";

/**
 * End-to-end test for the full device lifecycle:
 *   ZTP → DISCOVERED → Initialize via UI → MANAGED
 *
 * Prerequisites (handled by the "setup" project in setup.spec.js):
 *   - eosdist1 + eosdist2 added as MANAGED DIST devices
 *   - Management domain created (VLAN 600, 10.0.6.1/24)
 *   - eosaccess containerlab switch running (ZTP boot → DHCP_BOOT → DISCOVERED)
 */

/**
 * Poll the backend API until a non-DIST device reaches at least DISCOVERED.
 * Returns { device, alreadyInitialized } where alreadyInitialized is true
 * if the device has already moved past DISCOVERED (e.g. INIT or MANAGED).
 *
 * ZTP lifecycle: DHCP_BOOT → DISCOVERED → INIT → MANAGED
 * We keep polling while the device is missing or still in DHCP_BOOT.
 */
async function waitForDevice(page, timeoutMs = 600_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await page.request.get(`${API_BASE}/devices`, {
      headers: { Authorization: `Bearer ${JWT_TOKEN}` },
      ignoreHTTPSErrors: true,
    });
    const json = await response.json();
    const nonDist = json?.data?.devices?.find((d) => d.device_type !== "DIST");

    if (nonDist) {
      if (nonDist.state === "DHCP_BOOT") {
        // Still booting — keep waiting
        console.log(`Device ${nonDist.id} in ${nonDist.state} — waiting...`);
      } else if (nonDist.state === "DISCOVERED") {
        return { device: nonDist, alreadyInitialized: false };
      } else {
        // Already past DISCOVERED (INIT, MANAGED, etc.)
        return { device: nonDist, alreadyInitialized: true };
      }
    } else {
      console.log("No non-DIST device found yet — waiting for ZTP...");
    }

    await page.waitForTimeout(5000);
  }

  throw new Error(
    `No device reached DISCOVERED within ${timeoutMs / 1000} seconds`,
  );
}

test.describe("Device initialization", { tag: ["@ztp", "@e2e"] }, () => {
  // This test can take a long time — ZTP boot + discovery + init + config push.
  test.setTimeout(600_000); // 10 minutes

  test("initialize eosaccess through the UI", async ({ page }, testInfo) => {
    // Show the devices page while waiting, so --headed mode isn't stuck on about:blank
    await page.goto("/devices");

    // ── Step 1: Wait for a non-DIST device to appear ───────────────
    const { device, alreadyInitialized } =
      await test.step("Wait for ZTP device to reach DISCOVERED", () =>
        waitForDevice(page));
    const deviceId = device.id;
    console.log(`Device ${deviceId} reached ${device.state}`);

    if (!alreadyInitialized) {
      // ── Step 2: Navigate to devices page and find the device ───────
      console.log("Navigating to /devices...");
      await page.goto("/devices");

      // The device shows up with its MAC-based hostname (e.g. "mac-0C00C5232589")
      const deviceRow = page.getByRole("cell", { name: device.hostname });
      await expect(deviceRow).toBeVisible({ timeout: 15000 });

      // ── Step 3: Expand the device row ──────────────────────────────
      console.log(`Expanding device row for ${device.hostname}...`);
      const row = page.locator("tr", { hasText: device.hostname });
      const expandButton = row.locator("td").first();
      await expandButton.click();

      await testInfo.attach("device-discovered", {
        body: await page.screenshot(),
        contentType: "image/png",
      });

      // ── Step 4: Fill in the init form ──────────────────────────────
      const hostnameInput = page.getByPlaceholder("hostname");
      await expect(hostnameInput).toBeVisible({ timeout: 5000 });
      await hostnameInput.fill("eosaccess");

      // Select "Access" from the device type dropdown
      const deviceTypeDropdown = page.locator("div.ui.selection.dropdown");
      await deviceTypeDropdown.click();
      await page.getByRole("option", { name: "Access", exact: true }).click();
      console.log("Filled in hostname and device type");

      // ── Step 5: Click "Initialize..." to open the initcheck modal ──
      console.log("Opening initcheck modal...");
      const initButton = page.getByRole("button", { name: "Initialize..." });
      await initButton.click();

      // ── Step 6: Wait for the initcheck to complete ─────────────────
      const modal = page.locator(".ui.modal.visible.active");
      await expect(modal).toBeVisible({ timeout: 10000 });
      await expect(modal.getByText("Init compatability check")).toBeVisible();

      const startButton = modal.getByRole("button", {
        name: "Start initialization",
      });
      await expect(startButton).toBeEnabled({ timeout: 60000 });

      await expect(modal.getByText("Linknets:")).toBeVisible();
      await expect(modal.getByText("Compatible neighbors:")).toBeVisible();
      console.log("Initcheck passed — expanding detailed output...");

      // Expand the "Detailed output" accordion so it appears in the screenshot
      await modal.getByText("Detailed output").click();
      await expect(modal.locator(".content.active pre")).toBeVisible({
        timeout: 5000,
      });

      await testInfo.attach("initcheck-passed", {
        body: await page.screenshot(),
        contentType: "image/png",
      });

      // ── Step 7: Start initialization ───────────────────────────────
      await startButton.click();

      await expect(
        page.getByRole("button", { name: "Initializing..." }),
      ).toBeVisible({ timeout: 5000 });
      console.log("Initialization started");

      await testInfo.attach("initialization-started", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    } else {
      // Device already moved past DISCOVERED (e.g. from a previous run).
      console.log(
        `Device ${deviceId} already in state ${device.state} — skipping UI init.`,
      );
    }

    // ── Step 8: Wait for device to reach MANAGED ──────────────────
    // Poll the API until the device reaches MANAGED, then reload the
    // page once and verify the UI shows the correct state.
    await test.step("Wait for device to reach MANAGED (API polling)", async () => {
      console.log(
        "Waiting for device to reach MANAGED (polling API, will reload page when state changes)...",
      );
      const managedDeadline = Date.now() + 300_000; // 5 minutes
      while (Date.now() < managedDeadline) {
        const resp = await page.request.get(`${API_BASE}/devices`, {
          headers: { Authorization: `Bearer ${JWT_TOKEN}` },
          ignoreHTTPSErrors: true,
        });
        const json = await resp.json();
        const eosaccess = json?.data?.devices?.find(
          (d) => d.hostname === "eosaccess",
        );
        if (eosaccess?.state === "MANAGED") {
          console.log("Device reached MANAGED via API — reloading page...");
          return;
        }
        console.log(
          `Device state: ${eosaccess?.state ?? "not found"} — waiting...`,
        );
        await page.waitForTimeout(10_000);
      }
      throw new Error("Device did not reach MANAGED within 5 minutes");
    });

    await page.goto("/devices");
    await page.waitForLoadState("networkidle");

    const managedRow = page.locator("tr", { hasText: "eosaccess" });
    const managedCell = managedRow.getByRole("cell", { name: "MANAGED" });
    await expect(managedCell).toBeVisible({ timeout: 10_000 });
    console.log("Device is MANAGED!");

    await testInfo.attach("device-managed", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await expect(
      managedRow.getByRole("cell", { name: "ACCESS", exact: true }),
    ).toBeVisible();

    // ── Step 9: Verify jobs appeared on the jobs page ────────────
    console.log("Verifying jobs on /jobs...");
    await page.goto("/jobs");

    // The ZTP flow creates a discover_device job when the switch is found.
    const discoverJobRow = page.locator("tr", {
      hasText: "discover_device",
    });
    await expect(
      discoverJobRow.getByRole("cell", { name: "discover_device" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      discoverJobRow.getByRole("cell", { name: "FINISHED" }),
    ).toBeVisible();

    // The device init creates a job with function_name "init_access_device_step1".
    const initJobRow = page.locator("tr", {
      hasText: "init_access_device_step1",
    });
    await expect(
      initJobRow.getByRole("cell", { name: "init_access_device_step1" }),
    ).toBeVisible();
    await expect(
      initJobRow.getByRole("cell", { name: "FINISHED" }),
    ).toBeVisible();
  });
});
