import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "semantic-ui-react";
import { toast } from "react-semantic-toasts-2";

const BATCH_INTERVAL_MS = 1000;

// `react-semantic-toasts-2` types `description` as `string` but the underlying
// component renders any ReactNode. This wrapper localises the cast so call
// sites stay type-safe.
type ToastOptions = Omit<Parameters<typeof toast>[0], "description"> & {
  description?: ReactNode;
};

function showToast(options: ToastOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  toast(options as any);
}

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

      showToast({ type: "info", icon: "paper plane", title, time: 2000 });
      pendingHostnames.clear();
    }
    toastBatchTimer = null;
  }, BATCH_INTERVAL_MS);
}

// --- Sync warning toast batching ---

type SyncEventData = {
  readonly syncevent_hostname: string;
  readonly syncevent_data: {
    readonly cause: string;
    readonly by: string;
    readonly job_id?: number;
  };
};

let pendingSyncWarnings: SyncEventData[] = [];
let syncWarningBatchTimer: ReturnType<typeof setTimeout> | null = null;

export function showSyncWarningToast(data: SyncEventData): void {
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

      const description =
        count === 1 ? (
          <p>
            {pendingSyncWarnings[0].syncevent_data.cause} by{" "}
            {pendingSyncWarnings[0].syncevent_data.by} <br />
            <Button onClick={() => globalThis.location.reload()}>
              Reload page
            </Button>
          </p>
        ) : (
          <p>
            {count} sync events from other sessions <br />
            <Button onClick={() => globalThis.location.reload()}>
              Reload page
            </Button>
          </p>
        );

      showToast({
        type: "warning",
        icon: "paper plane",
        title,
        description,
        animation: "bounce",
        time: 0,
      });

      pendingSyncWarnings = [];
    }
    syncWarningBatchTimer = null;
  }, BATCH_INTERVAL_MS);
}

// --- Another session refresh toast ---

export function showAnotherSessionDidRefreshToast(jobId: number): void {
  showToast({
    type: "warning",
    icon: "paper plane",
    title: `Another session did refresh`,
    description: (
      <p>
        Dry run progress reset because refresh repo job {jobId}
        <br />
        <Link to="/jobs">job log</Link>
      </p>
    ),
    animation: "bounce",
    time: 0,
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
