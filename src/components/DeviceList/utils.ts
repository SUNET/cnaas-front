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
    replaceDeviceUnmanged: {
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
      deviceActions.replaceDeviceUnmanged,
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

/**
 * Extracts a human-readable error message from a thrown value.
 * Handles `checkJsonResponse` rejections (object with `.message`),
 * `Error` instances, and falls back to `String(err)`.
 */
export function extractErrorMessage(err: unknown): string {
  const message = readMessage(err);
  if (message !== null) return message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Async variant that also handles raw `Response` rejections from
 * `checkResponseStatus` — reads the JSON body to recover the backend's
 * `{message: ...}` envelope, falling back to text or `HTTP <status>`.
 * Use this in catch blocks that talk to `postData`/`deleteData`/`post`.
 */
export async function extractErrorMessageAsync(
  error: unknown,
): Promise<string> {
  if (typeof Response !== "undefined" && error instanceof Response) {
    try {
      const body: unknown = await error.clone().json();
      const message = readMessage(body);
      if (message !== null) return message;
      return JSON.stringify(body, null, 2);
    } catch {
      try {
        const text = await error.text();
        if (text) return text;
      } catch {
        /* ignore */
      }
      return `HTTP ${error.status} ${error.statusText}`;
    }
  }
  return extractErrorMessage(error);
}

// Narrows `{ message: string }` out of unknown without an `as` cast.
function readMessage(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  if (!("message" in value)) return null;
  const message = value.message;
  return typeof message === "string" ? message : null;
}
