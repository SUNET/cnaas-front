# E2E Tests

End-to-end tests for cnaas-front using Playwright, a real cnaas-nms backend,
and containerlab-simulated Arista switches.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Host machine                                            │
│ ┌───────────────┐   ┌─────────────────────────────────┐ │
│ │ Playwright    │   │ Backend (e2e/compose.yaml)      │ │
│ │   + Parcel    │   │  cnaas_api    (172.30.0.x)      │ │
│ │   dev server  │--▶│  cnaas_httpd                    │ │
│ │ localhost:1234│   │  cnaas_dhcpd  (port 67/udp)     │ │
│ └───────────────┘   │  cnaas_postgres, cnaas_redis    │ │
│                     │  Network: cnaas (172.30.0.0/24) │ │
│                     └─────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Containerlab (cnaas_mgmt network, 10.100.2.0/24)    │ │
│ │  eosdist1  (cEOS)   — 10.100.2.11 / 10.100.2.101    │ │
│ │  eosdist2  (cEOS)   — 10.100.2.12 / 10.100.2.102    │ │
│ │  eosaccess (vEOS)   — 10.100.2.13 (ZTP, no config)  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

The backend containers and containerlab switches are on separate Docker
networks. Host routes between them should be configured by
containerlab (via a `host` node with `exec` commands in the topology).

## Prerequisites

**Tools:**

- [containerlab](https://containerlab.dev/) (`sudo containerlab`)
- Docker + Docker Compose
- Node.js 18+ and npm
- Playwright (`npx playwright install chromium`)

**Containerlab topology** — the tests expect the following switches on the
`cnaas_mgmt` network (10.100.2.0/24):

- 2 × cEOS DIST switches (`eosdist1`, `eosdist2`) with startup configs
- 1 × vEOS ACCESS switch (`eosaccess`) with ZTP enabled and no startup config

The vEOS image must be built with ZTP enabled (the default
[vrnetlab](https://github.com/srl-labs/vrnetlab) build disables it).
See the containerlab topology repo for build and deploy instructions.

**Other repos:**

- [cnaas-nms](https://github.com/SUNET/cnaas-nms) — the backend

## Step-by-step: Running the full e2e suite

### Step 0 — Build backend Docker images (one-time)

From your local cnaas-nms checkout:

```bash
cd <your-cnaas-nms-repo>/docker
docker compose -f docker-compose.yaml build
```

This builds `cnaas-api`, `cnaas-redis`, and `docker_cnaas_dhcpd`.

### Step 1 — Deploy containerlab switches

Deploy the containerlab topology from your topology repo. After deployment,
you should have `eosdist1`, `eosdist2`, and `eosaccess` running on the
`cnaas_mgmt` network (10.100.2.0/24).

### Step 2 — Start the backend

```bash
# From the cnaas-front repo root:
./e2e/start-backend.sh
```

This starts the CNaaS API, HTTP server, DHCP server, Postgres, and Redis.
The backend runs without OIDC and with permissions disabled; authentication
uses a static JWT token signed by `e2e/public.pem`. The script waits until
the API is ready at `https://localhost`.

Verify:

```bash
curl -ks https://localhost/api/v1.0/system/version
```

### Step 3 — Run the tests

From repo root, run

```bash
npx playwright test --project=chromium
```

You can run tests for other browsers by changing the `--project` flag (e.g.
`--project=firefox` or `--project=webkit`), but note that the ZTP
initialization test (`ztp-init.spec.js`) can only run once per environment
since it initializes the access switch. To run it again you need to
redeploy containerlab with a clean `eosaccess` and restart the backend
(to clear the database volume).

What happens automatically:

1. **Setup project** (`e2e/setup.spec.js`) seeds the backend via API:
   - Refreshes the settings and templates git repos
   - Adds eosdist1 + eosdist2 as MANAGED DIST devices
   - Creates the management domain (VLAN 600, 10.0.6.1/24)
   - Skips all of this if already seeded (idempotent)

2. **Parcel dev server** starts at `http://localhost:1234`

3. **Tests run:**
   - `sanity-check.spec.js` — Smoke test (page loads)
   - `devices.spec.js` — Verifies device table shows all 3 devices
   - `ztp-init.spec.js` — ZTP:
     - Waits for eosaccess to reach DISCOVERED state (via ZTP)
     - Opens /devices, expands the discovered device row
     - Fills in hostname "eosaccess" and selects device type "Access"
     - Clicks "Initialize..." → initcheck modal opens
     - Waits for compatibility check to pass
     - Clicks "Start initialization"
     - Waits for the device to reach MANAGED state
     - Verifies the UI shows "eosaccess" as MANAGED ACCESS

### Step 4 — Tear down

```bash
# Stop the backend containers:
./e2e/stop-backend.sh

# Destroy containerlab (from your topology repo):
sudo containerlab destroy
```

## Running manually (interactive)

If you want to explore the flow in a browser instead of running automated
tests:

1. Complete Steps 1-2 above.

2. Seed the backend (this is what setup.spec.js does):

   ```bash
   JWT="eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw"

   # Add DIST devices
   curl -ks -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
     -d '{"hostname":"eosdist1","management_ip":"10.100.3.101","platform":"eos","state":"MANAGED","device_type":"DIST"}' \
     https://localhost/api/v1.0/device

   curl -ks -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
     -d '{"hostname":"eosdist2","management_ip":"10.100.3.102","platform":"eos","state":"MANAGED","device_type":"DIST"}' \
     https://localhost/api/v1.0/device

   # Create management domain
   curl -ks -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
     -d '{"ipv4_gw":"10.0.6.1/24","device_a":"eosdist1","device_b":"eosdist2","vlan":600}' \
     https://localhost/api/v1.0/mgmtdomains
   ```

   Then refresh the git repos from the UI: go to **Config change**
   (`/config-change`) and click **Refresh settings** and **Refresh
   templates** in Step 1.

3. Start the dev server:

   ```bash
   NODE_ENV=e2e npm run start
   ```

4. Open `http://localhost:1234` in your browser. Use the browser console to
   set the auth token:

   ```js
   localStorage.setItem(
     "token",
     "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw",
   );
   ```

   Then reload the page.

5. Go to **Devices** (`/devices`). You should see:
   - `eosdist1` and `eosdist2` as MANAGED DIST devices
   - `mac-XXXXXXXXXXXX` appearing as DISCOVERED (once ZTP completes)

6. Expand the DISCOVERED device → fill in hostname `eosaccess`, select
   device type `Access`, click **Initialize...** → verify the compatibility
   check passes → click **Start initialization**.

7. The device will go through INIT → MANAGED. Refresh the page to see
   the final state.

## Notable Files

```
├── .env.e2e               ← Environment variables for e2e frontend
├── playwright.config.js   ← Playwright configuration (loads .env.e2e)
└── e2e/
    ├── compose.yaml       ← Backend Docker Compose stack
    ├── public.pem         ← JWT public key for backend auth
    ├── setup.spec.js      ← Setup project (seeds DIST devices)
    └── ...
```
