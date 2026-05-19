// @ts-check
/**
 * Shared API helpers for e2e tests.
 *
 * All requests go to the local backend at API_BASE using the integration-test
 * JWT token. TLS verification is disabled because the backend uses a
 * self-signed certificate.
 *
 * Test devices created via createTestDevice() use the "eostest-" prefix so
 * they can be identified and cleaned up. They are plain DB rows — no clab
 * container backs them — which means metadata mutations (rename, state
 * change, delete) succeed without any real device interaction.
 */
import { JWT_TOKEN, API_BASE } from "../constants.js";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/** Prefix used for all throwaway devices created by tests. */
export const TEST_DEVICE_PREFIX = "eostest-";

/**
 * Make an authenticated API request.
 * Throws if the response is not ok.
 *
 * @param {string} method
 * @param {string} path  Path under API_BASE, eg "/devices"
 * @param {unknown} [body]
 */
export async function apiRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `API ${method} ${path} failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return json;
}

/**
 * Poll a job until it reaches FINISHED. Used by setup for repo refresh jobs.
 *
 * @param {number} jobId
 * @param {number} [timeoutMs]
 */
export async function waitForJob(jobId, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await apiRequest("GET", `/job/${jobId}`);
    const status = data?.data?.jobs?.[0]?.status;
    if (status === "FINISHED") return data.data.jobs[0];
    if (status === "EXCEPTION") {
      throw new Error(`Job ${jobId} failed: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Job ${jobId} did not finish within ${timeoutMs}ms`);
}

/**
 * Look up a device by hostname. Returns the device object or null if not
 * found (404 from the backend).
 *
 * @param {string} hostname
 */
export async function getDeviceByHostname(hostname) {
  try {
    const data = await apiRequest("GET", `/device/${hostname}`);
    return data?.data?.devices?.[0] ?? null;
  } catch (err) {
    if (err instanceof Error && err.message.includes("(404)")) return null;
    throw err;
  }
}

/**
 * Create a throwaway test device with sensible defaults for a plain
 * DB-only ACCESS switch. Hostname must begin with TEST_DEVICE_PREFIX.
 *
 * `opts` is forwarded to the backend as-is, so it uses backend (snake_case)
 * field names: hostname, management_ip, state, device_type, platform.
 *
 * @param {{
 *   hostname: string,
 *   management_ip: string,
 *   state?: string,
 *   device_type?: string,
 *   platform?: string,
 * }} opts
 */
export async function createTestDevice(opts) {
  if (!opts.hostname.startsWith(TEST_DEVICE_PREFIX)) {
    throw new Error(
      `Test devices must be prefixed with "${TEST_DEVICE_PREFIX}" (got "${opts.hostname}")`,
    );
  }
  return apiRequest("POST", "/device", {
    state: "MANAGED",
    device_type: "ACCESS",
    platform: "eos",
    ...opts,
  });
}

/**
 * Delete a device by hostname. Silently succeeds if the device is already
 * gone, which makes it safe for afterEach/afterAll cleanup whether the
 * test deleted via UI or crashed before getting there.
 *
 * @param {string} hostname
 */
export async function deleteTestDeviceIfExists(hostname) {
  const device = await getDeviceByHostname(hostname);
  if (!device) return;
  try {
    await apiRequest("DELETE", `/device/${device.id}`);
  } catch (err) {
    // tolerate races where another worker deleted between lookup and delete
    if (!(err instanceof Error && err.message.includes("(404)"))) throw err;
  }
}

/**
 * Final safety net: delete every device whose hostname starts with the
 * test prefix. Use in afterAll to mop up after crashes.
 *
 * Tolerates 404s — when parallel workers run this in their own afterAll,
 * the same survivor may be deleted twice.
 */
export async function cleanupAllTestDevices() {
  const res = await apiRequest("GET", "/devices");
  const devices = res?.data?.devices ?? [];
  const survivors = devices.filter((d) =>
    d.hostname.startsWith(TEST_DEVICE_PREFIX),
  );
  await Promise.all(survivors.map((d) => deleteTestDeviceIfExists(d.hostname)));
}
