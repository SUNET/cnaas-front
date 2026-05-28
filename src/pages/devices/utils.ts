import type { Device, DeviceState } from "../../types/device";
import { isAccessDevice, isDistDevice } from "../../types/device";

export type MenuActionHandlers = {
  readonly handleDeleteModalOpen: (device: Device) => void;
  readonly handleShowHostnameModal: (
    deviceId: number,
    hostname: string,
  ) => void;
  readonly syncDeviceAction: (hostname: string) => void;
  readonly upgradeDeviceAction: (hostname: string) => void;
  readonly updateFactsAction: (hostname: string, deviceId: number) => void;
  readonly changeStateAction: (deviceId: number, state: DeviceState) => void;
  readonly handleShowConfigModalOpen: (
    hostname: string,
    state: DeviceState,
  ) => void;
  readonly handleDeviceStateModalOpen: (
    hostname: string,
    deviceId: number,
    state: DeviceState,
  ) => void;
  readonly changeStateLocally: (deviceId: number, state: DeviceState) => void;
  readonly configurePortsAction: (hostname: string) => void;
};

export type MenuAction = {
  readonly key: string;
  readonly text: string;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly condition?: boolean;
};

function isDistPortConfigEnabled(): boolean {
  const raw = globalThis.localStorage?.getItem("distPortConfig");
  if (!raw) return false;
  try {
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

export function getMenuActionsConfig(
  device: Device,
  handlers: MenuActionHandlers,
): readonly MenuAction[] {
  const deviceActions = {
    noAction: {
      key: "noaction",
      text: "No actions allowed in this state",
      disabled: true,
    },
    delete: {
      key: "delete",
      text: "Delete device...",
      onClick: () => handlers.handleDeleteModalOpen(device),
    },
    changeHostname: {
      key: "changehostname",
      text: "Change hostname...",
      onClick: () =>
        handlers.handleShowHostnameModal(device.id, device.hostname),
    },
    sync: {
      key: "sync",
      text: "Sync device...",
      onClick: () => handlers.syncDeviceAction(device.hostname),
    },
    fwUpgrade: {
      key: "fwupgrade",
      text: "Firmware upgrade...",
      onClick: () => handlers.upgradeDeviceAction(device.hostname),
    },
    updateFacts: {
      key: "facts",
      text: "Update facts",
      onClick: () => handlers.updateFactsAction(device.hostname, device.id),
    },
    makeManaged: {
      key: "makemanaged",
      text: "Make managed",
      onClick: () => handlers.changeStateAction(device.id, "MANAGED"),
    },
    makeUnmanaged: {
      key: "makeunmanaged",
      text: "Make unmanaged",
      onClick: () => handlers.changeStateAction(device.id, "UNMANAGED"),
    },
    showConfig: {
      key: "showconfig",
      text: "Show configuration",
      onClick: () =>
        handlers.handleShowConfigModalOpen(device.hostname, device.state),
    },
    replaceDevice: {
      key: "replacedevice",
      text: "Replace device...",
      onClick: () =>
        handlers.handleDeviceStateModalOpen(
          device.hostname,
          device.id,
          "UNMANAGED",
        ),
      condition: isAccessDevice(device),
    },
    replaceDeviceUnmanaged: {
      key: "replacedevice",
      text: "Replace device...",
      onClick: () =>
        handlers.changeStateLocally(device.id, "UNMANAGED (Replacing)"),
      condition: isAccessDevice(device),
    },
    configurePorts: {
      key: "configports",
      text: "Configure ports",
      onClick: () => handlers.configurePortsAction(device.hostname),
      condition:
        isAccessDevice(device) ||
        (isDistDevice(device) && isDistPortConfigEnabled()),
    },
  } as const satisfies Record<string, MenuAction>;

  if (device?.deleted === true) {
    return [deviceActions.noAction];
  }

  const menuByState: Record<string, readonly MenuAction[]> = {
    DHCP_BOOT: [deviceActions.delete, deviceActions.changeHostname],
    DISCOVERED: [deviceActions.delete],
    MANAGED: [
      deviceActions.sync,
      deviceActions.fwUpgrade,
      deviceActions.updateFacts,
      deviceActions.makeUnmanaged,
      deviceActions.showConfig,
      deviceActions.changeHostname,
      deviceActions.replaceDevice,
      deviceActions.delete,
      deviceActions.configurePorts,
    ],
    UNMANAGED: [
      deviceActions.updateFacts,
      deviceActions.makeManaged,
      deviceActions.showConfig,
      deviceActions.changeHostname,
      deviceActions.replaceDeviceUnmanaged,
      deviceActions.delete,
    ],
  };

  const stateKey = device.state.startsWith("UNMANAGED")
    ? "UNMANAGED"
    : device.state;

  const menuActions = menuByState[stateKey];
  if (!menuActions) {
    return [deviceActions.noAction];
  }

  return menuActions.filter(
    (action) => action.condition === undefined || action.condition,
  );
}

// --- Job log lines ---
//
// The socket emits one log line per job status change. Lines are stored in
// `state.logLines` and later grouped per-device by matching the job id.
// Producer (`formatJobLogLine`) and consumer (`jobLineMatcher`) MUST stay
// in lock-step — the matcher's regex parses the producer's format.

export function formatJobLogLine(
  jobId: number,
  status: string,
  exception?: string,
): string {
  return status === "EXCEPTION"
    ? `job #${jobId} changed status to ${status}: ${exception}\n`
    : `job #${jobId} changed status to ${status}\n`;
}

// Delimiter-aware match: avoid "job #10" picking up "job #100" lines.
export function jobLineMatcher(jobId: number): RegExp {
  return new RegExp(`job #${jobId}(?!\\d)`, "i");
}
