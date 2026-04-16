// @ts-check
/**
 * Playwright setup project — seeds the backend with DIST devices and a
 * management domain so the e2e tests have something to work with.
 *
 * This runs as a project dependency before the browser test projects.
 * See playwright.config.js for the dependency configuration.
 *
 * Mirrors what cnaas-nms/test/integrationtests.py does in test_00_sync
 * and test_01_init_dist, but via plain HTTP from Playwright.
 */
import { test as setup } from "@playwright/test";
import { JWT_TOKEN, API_BASE } from "../constants.js";

/** @param {string} path */
function url(path) {
  return `${API_BASE}${path}`;
}

/**
 * Helper: make an authenticated API request.
 * We disable TLS verification because the backend uses a self-signed cert.
 */
async function api(method, path, body) {
  const res = await fetch(url(path), {
    method,
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `API ${method} ${path} failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }

  return json;
}

/**
 * Wait for a job to reach FINISHED state.
 * @param {number} jobId
 * @param {number} [timeoutMs=30000]
 */
async function waitForJob(jobId, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await api("GET", `/job/${jobId}`);
    const status = data?.data?.jobs?.[0]?.status;
    if (status === "FINISHED") return data.data.jobs[0];
    if (status === "EXCEPTION") {
      throw new Error(`Job ${jobId} failed: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Job ${jobId} did not finish within ${timeoutMs}ms`);
}

setup("seed backend with DIST devices and management domain", async () => {
  // make sure self-signed certs are accepted.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  console.log("\n[setup] Seeding backend...");

  // ── Step 0: Check if devices already exist ─────────────────────────
  const existing = await api("GET", "/devices");
  const devices = existing?.data?.devices ?? [];
  if (devices.some((d) => d.hostname === "eosdist1" && d.state === "MANAGED")) {
    console.log("[setup] eosdist1 already exists — skipping seed.");
    return;
  }

  // ── Step 1: Refresh repositories ───────────────────────────────────
  console.log("[setup] Refreshing settings repo...");
  const settingsResult = await api("PUT", "/repository/settings", {
    action: "refresh",
  });
  const settingsJobId = settingsResult?.data?.job_id;
  if (settingsJobId) await waitForJob(settingsJobId);

  console.log("[setup] Refreshing templates repo...");
  const templatesResult = await api("PUT", "/repository/templates", {
    action: "refresh",
  });
  const templatesJobId = templatesResult?.data?.job_id;
  if (templatesJobId) await waitForJob(templatesJobId);

  // ── Step 2: Add DIST devices as MANAGED ────────────────────────────
  console.log("[setup] Adding eosdist1...");
  await api("POST", "/device", {
    hostname: "eosdist1",
    management_ip: "10.100.3.101",
    platform: "eos",
    state: "MANAGED",
    device_type: "DIST",
  });

  console.log("[setup] Adding eosdist2...");
  await api("POST", "/device", {
    hostname: "eosdist2",
    management_ip: "10.100.3.102",
    platform: "eos",
    state: "MANAGED",
    device_type: "DIST",
  });

  // ── Step 3: Create management domain ───────────────────────────────
  console.log("[setup] Creating management domain...");
  await api("POST", "/mgmtdomains", {
    ipv4_gw: "10.0.6.1/24",
    device_a: "eosdist1",
    device_b: "eosdist2",
    vlan: 600,
  });

  console.log("[setup] Backend seeded successfully.");
});
