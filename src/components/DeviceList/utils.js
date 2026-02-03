export const getMenuActionsConfig = (device, handlers) => {
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
      condition: device.device_type === "ACCESS",
    },
    replaceDeviceUnmanged: {
      key: "replacedevice",
      text: "Replace device...",
      onClick: () =>
        handlers.changeStateLocally(device.id, "UNMANAGED (Replacing)"),
      condition: device.device_type === "ACCESS",
    },
    configurePorts: {
      key: "configports",
      text: "Configure ports",
      onClick: () => handlers.configurePortsAction(device.hostname),
      condition:
        device.device_type === "ACCESS" ||
        (device.device_type === "DIST" &&
          localStorage.getItem("distPortConfig") &&
          JSON.parse(localStorage.getItem("distPortConfig")) === true),
    },
  };

  if (device?.deleted === true) {
    return [deviceActions.noAction];
  }

  const menuByState = {
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

  let stateKey = device.state;
  if (device.state.startsWith("UNMANAGED")) {
    stateKey = "UNMANAGED";
  }

  const menuActions = menuByState[stateKey];
  if (!menuActions) {
    return [deviceActions.noAction];
  }

  return menuActions.filter((action) => {
    // If there's no condition, always include the action
    if (action.condition === undefined) return true;
    // Otherwise, only include if condition is true
    return action.condition;
  });
};
