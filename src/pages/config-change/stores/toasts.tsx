import { Link } from "react-router";
import Button from "@mui/material/Button";
import { showToast } from "../../../components/toast";
import type { SyncNotification } from "./socketEvents";

const BATCH_INTERVAL_MS = 1000;

// --- Sync toast batching ---

const pendingHostnames = new Set<string>();
let toastBatchTimer: ReturnType<typeof setTimeout> | null = null;

export function showSyncToast(hostname: string): void {
  pendingHostnames.add(hostname);

  if (toastBatchTimer) {
    clearTimeout(toastBatchTimer);
  }

  toastBatchTimer = setTimeout(() => {
    const hostnames = Array.from(pendingHostnames);
    if (hostnames.length > 0) {
      const title =
        hostnames.length === 1
          ? `Refresh affected: ${hostnames[0]}`
          : `Refresh affected: ${hostnames.length} devices`;

      showToast({ severity: "info", title, duration: 2000 });
      pendingHostnames.clear();
    }
    toastBatchTimer = null;
  }, BATCH_INTERVAL_MS);
}

// --- Sync warning toast batching ---

let pendingSyncWarnings: SyncNotification[] = [];
let syncWarningBatchTimer: ReturnType<typeof setTimeout> | null = null;

export function showSyncWarningToast(data: SyncNotification): void {
  pendingSyncWarnings.push(data);

  if (syncWarningBatchTimer) {
    clearTimeout(syncWarningBatchTimer);
  }

  syncWarningBatchTimer = setTimeout(() => {
    if (pendingSyncWarnings.length > 0) {
      const count = pendingSyncWarnings.length;
      const title =
        count === 1
          ? `Sync event: ${pendingSyncWarnings[0].syncevent_hostname}`
          : `Multiple sync events`;

      const message =
        count === 1 ? (
          <>
            {pendingSyncWarnings[0].syncevent_data.cause} by{" "}
            {pendingSyncWarnings[0].syncevent_data.by} <br />
            <Button
              variant="text"
              size="small"
              onClick={() => globalThis.location.reload()}
            >
              Reload page
            </Button>
          </>
        ) : (
          <>
            {count} sync events from other sessions <br />
            <Button
              variant="text"
              size="small"
              onClick={() => globalThis.location.reload()}
            >
              Reload page
            </Button>
          </>
        );

      showToast({ severity: "warning", title, message });

      pendingSyncWarnings = [];
    }
    syncWarningBatchTimer = null;
  }, BATCH_INTERVAL_MS);
}

// --- Another session refresh toast ---

export function showAnotherSessionDidRefreshToast(jobId: number): void {
  showToast({
    severity: "warning",
    title: `Another session did refresh`,
    message: (
      <>
        Dry run progress reset because refresh repo job {jobId}
        <br />
        <Link to="/jobs">job log</Link>
      </>
    ),
  });
}

// --- Cleanup ---

export function clearToastTimers(): void {
  if (toastBatchTimer) {
    clearTimeout(toastBatchTimer);
    toastBatchTimer = null;
    pendingHostnames.clear();
  }
  if (syncWarningBatchTimer) {
    clearTimeout(syncWarningBatchTimer);
    syncWarningBatchTimer = null;
    pendingSyncWarnings = [];
  }
}
