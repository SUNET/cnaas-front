import { getMenuActionsConfig, type MenuActionHandlers } from "./utils";
import { makeDevice } from "./testUtils";
import type { Device } from "../../types/device";

const noopHandlers: MenuActionHandlers = {
  handleDeleteModalOpen: jest.fn(),
  handleShowHostnameModal: jest.fn(),
  syncDeviceAction: jest.fn(),
  upgradeDeviceAction: jest.fn(),
  updateFactsAction: jest.fn(),
  changeStateAction: jest.fn(),
  handleShowConfigModalOpen: jest.fn(),
  handleDeviceStateModalOpen: jest.fn(),
  changeStateLocally: jest.fn(),
  configurePortsAction: jest.fn(),
};

const device = (overrides: Partial<Device> = {}): Device =>
  makeDevice(1, overrides);

afterEach(() => {
  globalThis.localStorage.clear();
  jest.clearAllMocks();
});

describe("getMenuActionsConfig", () => {
  test("deleted device exposes only the noAction entry", () => {
    const actions = getMenuActionsConfig(
      device({ deleted: true }),
      noopHandlers,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].key).toBe("noaction");
    expect(actions[0].disabled).toBe(true);
  });

  test("unknown state falls back to noAction", () => {
    const actions = getMenuActionsConfig(
      // Cast: defensive runtime fallback for unexpected backend values.
      device({ state: "WEIRD" as unknown as Device["state"] }),
      noopHandlers,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].key).toBe("noaction");
  });

  test("DHCP_BOOT exposes delete + changeHostname", () => {
    const keys = getMenuActionsConfig(
      device({ state: "DHCP_BOOT" }),
      noopHandlers,
    ).map((a) => a.key);
    expect(keys).toEqual(["delete", "changehostname"]);
  });

  test("MANAGED ACCESS includes replaceDevice and configurePorts", () => {
    const keys = getMenuActionsConfig(device(), noopHandlers).map((a) => a.key);
    expect(keys).toContain("replacedevice");
    expect(keys).toContain("configports");
  });

  test("MANAGED DIST hides replaceDevice and configurePorts when distPortConfig disabled", () => {
    const keys = getMenuActionsConfig(
      device({ device_type: "DIST" }),
      noopHandlers,
    ).map((a) => a.key);
    expect(keys).not.toContain("replacedevice");
    expect(keys).not.toContain("configports");
  });

  test("MANAGED DIST shows configurePorts when distPortConfig enabled", () => {
    globalThis.localStorage.setItem("distPortConfig", "true");
    const keys = getMenuActionsConfig(
      device({ device_type: "DIST" }),
      noopHandlers,
    ).map((a) => a.key);
    expect(keys).toContain("configports");
  });

  test("malformed distPortConfig localStorage falls back to disabled", () => {
    globalThis.localStorage.setItem("distPortConfig", "{not-json");
    const keys = getMenuActionsConfig(
      device({ device_type: "DIST" }),
      noopHandlers,
    ).map((a) => a.key);
    expect(keys).not.toContain("configports");
  });

  test("any state starting with UNMANAGED uses the UNMANAGED menu", () => {
    const keys = getMenuActionsConfig(
      device({ state: "UNMANAGED (Replacing)" }),
      noopHandlers,
    ).map((a) => a.key);
    expect(keys).toContain("makemanaged");
  });

  test("delete action onClick invokes handleDeleteModalOpen with the device", () => {
    const dev = device({ state: "DISCOVERED" });
    const actions = getMenuActionsConfig(dev, noopHandlers);
    const deleteAction = actions.find((a) => a.key === "delete");
    deleteAction?.onClick?.();
    expect(noopHandlers.handleDeleteModalOpen).toHaveBeenCalledWith(dev);
  });

  test("makeManaged onClick dispatches MANAGED state change", () => {
    const dev = device({ state: "UNMANAGED" });
    const actions = getMenuActionsConfig(dev, noopHandlers);
    const action = actions.find((a) => a.key === "makemanaged");
    action?.onClick?.();
    expect(noopHandlers.changeStateAction).toHaveBeenCalledWith(1, "MANAGED");
  });

  test("UNMANAGED replaceDeviceUnmanaged uses changeStateLocally", () => {
    const dev = device({ state: "UNMANAGED" });
    const actions = getMenuActionsConfig(dev, noopHandlers);
    const action = actions.find((a) => a.key === "replacedevice");
    action?.onClick?.();
    expect(noopHandlers.changeStateLocally).toHaveBeenCalledWith(
      1,
      "UNMANAGED (Replacing)",
    );
  });
});
