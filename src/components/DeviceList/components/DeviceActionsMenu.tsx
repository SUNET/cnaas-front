import { Dropdown } from "semantic-ui-react";

import type { Device } from "../../../types/device";
import { useDeviceListActions } from "../hooks/useDeviceListActions";
import { getMenuActionsConfig } from "../utils";

type DeviceActionsMenuProps = {
  readonly device: Device;
};

/**
 * Per-device actions dropdown. The menu items come from
 * `getMenuActionsConfig` (pure data) wired to handlers from
 * `useDeviceListActions`.
 */
export function DeviceActionsMenu({ device }: DeviceActionsMenuProps) {
  const {
    changeStateAction,
    changeStateLocally,
    configurePortsAction,
    handleDeleteModalOpen,
    handleDeviceStateModalOpen,
    handleShowConfigModalOpen,
    handleHostnameModalOpen,
    syncDeviceAction,
    updateFactsAction,
    upgradeDeviceAction,
  } = useDeviceListActions();

  const handlers = {
    changeStateAction,
    changeStateLocally,
    configurePortsAction,
    handleDeleteModalOpen,
    handleDeviceStateModalOpen,
    handleShowConfigModalOpen,
    handleShowHostnameModal: handleHostnameModalOpen,
    syncDeviceAction,
    updateFactsAction,
    upgradeDeviceAction,
  };

  return (
    <>
      {getMenuActionsConfig(device, handlers).map((action) => (
        <Dropdown.Item
          key={action.key}
          text={action.text}
          onClick={action.onClick}
          disabled={action.disabled}
        />
      ))}
    </>
  );
}
