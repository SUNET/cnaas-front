import type { Device } from "../../../types/device";
import { makeDevice } from "../testUtils";
import {
  actions,
  buildInitialState,
  deviceListReducer,
  type DeviceListState,
  type InitialSettings,
} from "./deviceListReducer";

const SETTINGS: InitialSettings = {
  filterData: {},
  filterActive: false,
  sortColumn: null,
  sortDirection: null,
  activePage: 1,
  activeColumns: ["id", "hostname"],
  resultsPerPage: 20,
};

const baseState = (): DeviceListState => buildInitialState(SETTINGS);

const dev = (id: number, overrides: Partial<Device> = {}): Device =>
  makeDevice(id, overrides);

describe("deviceListReducer", () => {
  test("buildInitialState wires settings into state", () => {
    const state = baseState();
    expect(state.activePage).toBe(1);
    expect(state.activeColumns).toEqual(["id", "hostname"]);
  });

  test("SET_DEVICES replaces deviceData", () => {
    const next = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1), dev(2)],
    });
    expect(next.deviceData).toHaveLength(2);
    expect(next.deviceData[0].id).toBe(1);
  });

  test("UPDATE_DEVICE replaces only matching device", () => {
    const start = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1), dev(2)],
    });
    const next = deviceListReducer(start, {
      type: actions.UPDATE_DEVICE,
      deviceId: 2,
      device: dev(2, { hostname: "renamed" }),
    });
    expect(next.deviceData[0].hostname).toBe("host-1");
    expect(next.deviceData[1].hostname).toBe("renamed");
  });

  test("UPDATE_DEVICE drops hostname-keyed caches when hostname changes", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1, { hostname: "old" })],
    });
    state = deviceListReducer(state, {
      type: actions.CACHE_INTERFACES,
      deviceId: 1,
      interfaces: [],
    });
    state = deviceListReducer(state, {
      type: actions.CACHE_NETBOX_DEVICE,
      deviceId: 1,
      data: { stale: true },
    });
    expect(state.deviceInterfaceData[1]).toBeDefined();
    expect(state.netboxDeviceData[1]).toBeDefined();

    const next = deviceListReducer(state, {
      type: actions.UPDATE_DEVICE,
      deviceId: 1,
      device: dev(1, { hostname: "new" }),
    });
    expect(next.deviceInterfaceData[1]).toBeUndefined();
    expect(next.netboxDeviceData[1]).toBeUndefined();
  });

  test("UPDATE_DEVICE preserves caches when hostname unchanged", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1, { hostname: "same" })],
    });
    state = deviceListReducer(state, {
      type: actions.CACHE_NETBOX_DEVICE,
      deviceId: 1,
      data: { kept: true },
    });
    const next = deviceListReducer(state, {
      type: actions.UPDATE_DEVICE,
      deviceId: 1,
      device: dev(1, { hostname: "same", state: "MANAGED" }),
    });
    expect(next.netboxDeviceData[1]).toEqual({ kept: true });
  });

  test("MARK_DEVICE_DELETED flips deleted flag", () => {
    const start = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1)],
    });
    const next = deviceListReducer(start, {
      type: actions.MARK_DEVICE_DELETED,
      deviceId: 1,
    });
    expect(next.deviceData[0].deleted).toBe(true);
  });

  test("PATCH_DEVICE_STATE updates only the state field", () => {
    const start = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1, { state: "MANAGED" })],
    });
    const next = deviceListReducer(start, {
      type: actions.PATCH_DEVICE_STATE,
      deviceId: 1,
      state: "UNMANAGED",
    });
    expect(next.deviceData[0].state).toBe("UNMANAGED");
    expect(next.deviceData[0].hostname).toBe("host-1");
  });

  test("PATCH_DEVICE_STATE also updates synchronized when provided", () => {
    const start = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1, { state: "UNMANAGED", synchronized: true })],
    });
    const next = deviceListReducer(start, {
      type: actions.PATCH_DEVICE_STATE,
      deviceId: 1,
      state: "MANAGED",
      synchronized: false,
    });
    expect(next.deviceData[0].state).toBe("MANAGED");
    expect(next.deviceData[0].synchronized).toBe(false);
  });

  test("PATCH_DEVICE_STATE leaves synchronized untouched when omitted", () => {
    const start = deviceListReducer(baseState(), {
      type: actions.SET_DEVICES,
      devices: [dev(1, { state: "UNMANAGED", synchronized: true })],
    });
    const next = deviceListReducer(start, {
      type: actions.PATCH_DEVICE_STATE,
      deviceId: 1,
      state: "MANAGED",
    });
    expect(next.deviceData[0].synchronized).toBe(true);
  });

  test("SET_FILTER and SET_FILTER_ACTIVE", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.SET_FILTER,
      filterData: { hostname: "abc" },
    });
    expect(state.filterData).toEqual({ hostname: "abc" });
    state = deviceListReducer(state, {
      type: actions.SET_FILTER_ACTIVE,
      active: true,
    });
    expect(state.filterActive).toBe(true);
  });

  test("SET_FILTER auto-syncs filterActive: true when non-empty", () => {
    const state = deviceListReducer(baseState(), {
      type: actions.SET_FILTER,
      filterData: { hostname: "abc" },
    });
    expect(state.filterActive).toBe(true);
  });

  test("SET_FILTER auto-syncs filterActive: false when empty", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.SET_FILTER,
      filterData: { hostname: "abc" },
    });
    expect(state.filterActive).toBe(true);
    state = deviceListReducer(state, {
      type: actions.SET_FILTER,
      filterData: {},
    });
    expect(state.filterActive).toBe(false);
  });

  test("SET_FILTER resets activePage to 1", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.SET_ACTIVE_PAGE,
      page: 5,
    });
    expect(state.activePage).toBe(5);
    state = deviceListReducer(state, {
      type: actions.SET_FILTER,
      filterData: { hostname: "abc" },
    });
    expect(state.activePage).toBe(1);
  });

  test("SET_SORT writes both column and direction", () => {
    const next = deviceListReducer(baseState(), {
      type: actions.SET_SORT,
      column: "hostname",
      direction: "ascending",
    });
    expect(next.sortColumn).toBe("hostname");
    expect(next.sortDirection).toBe("ascending");
  });

  test("CLEAR_FILTER_AND_SORT resets sort/filter/page", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.SET_FILTER,
      filterData: { hostname: "abc" },
    });
    state = deviceListReducer(state, {
      type: actions.SET_FILTER_ACTIVE,
      active: true,
    });
    state = deviceListReducer(state, {
      type: actions.SET_SORT,
      column: "hostname",
      direction: "ascending",
    });
    state = deviceListReducer(state, {
      type: actions.SET_ACTIVE_PAGE,
      page: 5,
    });
    const next = deviceListReducer(state, {
      type: actions.CLEAR_FILTER_AND_SORT,
    });
    expect(next.filterData).toEqual({});
    expect(next.filterActive).toBe(false);
    expect(next.sortColumn).toBeNull();
    expect(next.sortDirection).toBeNull();
    expect(next.activePage).toBe(1);
  });

  test("CACHE_INTERFACES stores entries by deviceId", () => {
    const state = deviceListReducer(baseState(), {
      type: actions.CACHE_INTERFACES,
      deviceId: 1,
      interfaces: [],
    });
    expect(state.deviceInterfaceData[1]).toEqual([]);
  });

  test("ADD_DEVICE_JOB appends to existing list", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 1,
      jobId: 100,
    });
    state = deviceListReducer(state, {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 1,
      jobId: 101,
    });
    expect(state.deviceJobs[1]).toEqual([100, 101]);
  });

  test("CHAIN_DEVICE_NEXT_JOB only chains devices whose job list contains the completed job", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 1,
      jobId: 100,
    });
    state = deviceListReducer(state, {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 2,
      jobId: 200,
    });
    state = deviceListReducer(state, {
      type: actions.CHAIN_DEVICE_NEXT_JOB,
      jobId: 100,
      nextJobId: 101,
    });
    expect(state.deviceJobs[1]).toEqual([100, 101]);
    expect(state.deviceJobs[2]).toEqual([200]);
  });

  test("CHAIN_DEVICE_NEXT_JOB appends the next job after any existing queued jobs", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 1,
      jobId: 100,
    });
    state = deviceListReducer(state, {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 1,
      jobId: 102,
    });
    state = deviceListReducer(state, {
      type: actions.CHAIN_DEVICE_NEXT_JOB,
      jobId: 100,
      nextJobId: 101,
    });
    expect(state.deviceJobs[1]).toEqual([100, 102, 101]);
  });

  test("CHAIN_DEVICE_NEXT_JOB still matches a job that is no longer the head of the list", () => {
    // After a previous chain, the original job sits at index 0 and the
    // chained job at index 1. A later completion event for the chained
    // job must still match and append its successor.
    let state = deviceListReducer(baseState(), {
      type: actions.ADD_DEVICE_JOB,
      deviceId: 1,
      jobId: 100,
    });
    state = deviceListReducer(state, {
      type: actions.CHAIN_DEVICE_NEXT_JOB,
      jobId: 100,
      nextJobId: 101,
    });
    state = deviceListReducer(state, {
      type: actions.CHAIN_DEVICE_NEXT_JOB,
      jobId: 101,
      nextJobId: 102,
    });
    expect(state.deviceJobs[1]).toEqual([100, 101, 102]);
  });

  test("APPEND_LOG caps at 1000 lines", () => {
    let state = baseState();
    for (let i = 0; i < 1005; i++) {
      state = deviceListReducer(state, {
        type: actions.APPEND_LOG,
        line: `line-${i}`,
      });
    }
    expect(state.logLines).toHaveLength(1000);
    expect(state.logLines[0]).toBe("line-5");
    expect(state.logLines[999]).toBe("line-1004");
  });

  test("CACHE_NETBOX_MODEL and CACHE_NETBOX_DEVICE merge entries", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.CACHE_NETBOX_MODEL,
      model: "ABC",
      data: { x: 1 },
    });
    state = deviceListReducer(state, {
      type: actions.CACHE_NETBOX_DEVICE,
      deviceId: 42,
      data: { y: 2 },
    });
    expect(state.netboxModelData.ABC).toEqual({ x: 1 });
    expect(state.netboxDeviceData[42]).toEqual({ y: 2 });
  });

  test("default branch returns same state reference", () => {
    const start = baseState();
    const next = deviceListReducer(
      start,
      // @ts-expect-error -- testing unknown action
      { type: "UNKNOWN_ACTION" },
    );
    expect(next).toBe(start);
  });

  test("EXPAND_DEVICES adds multiple new ids", () => {
    const s1 = deviceListReducer(baseState(), {
      type: actions.EXPAND_DEVICES,
      deviceIds: [3, 7, 11],
    });
    expect(s1.expandedIds.has(3)).toBe(true);
    expect(s1.expandedIds.has(7)).toBe(true);
    expect(s1.expandedIds.has(11)).toBe(true);
  });

  test("EXPAND_DEVICES is idempotent when all ids already present", () => {
    const s1 = deviceListReducer(baseState(), {
      type: actions.EXPAND_DEVICES,
      deviceIds: [7],
    });
    const s2 = deviceListReducer(s1, {
      type: actions.EXPAND_DEVICES,
      deviceIds: [7],
    });
    expect(s2).toBe(s1);
  });

  test("EXPAND_DEVICES with empty array returns same state ref", () => {
    const start = baseState();
    const next = deviceListReducer(start, {
      type: actions.EXPAND_DEVICES,
      deviceIds: [],
    });
    expect(next).toBe(start);
  });

  test("EXPAND_DEVICES adds only new ids when mixed with existing", () => {
    const s1 = deviceListReducer(baseState(), {
      type: actions.EXPAND_DEVICES,
      deviceIds: [7],
    });
    const s2 = deviceListReducer(s1, {
      type: actions.EXPAND_DEVICES,
      deviceIds: [7, 9],
    });
    expect(s2).not.toBe(s1);
    expect(s2.expandedIds.has(7)).toBe(true);
    expect(s2.expandedIds.has(9)).toBe(true);
  });

  test("COLLAPSE_DEVICE removes id; no-op when absent", () => {
    const start = baseState();
    const same = deviceListReducer(start, {
      type: actions.COLLAPSE_DEVICE,
      deviceId: 99,
    });
    expect(same).toBe(start);
    const expanded = deviceListReducer(start, {
      type: actions.EXPAND_DEVICES,
      deviceIds: [7],
    });
    const collapsed = deviceListReducer(expanded, {
      type: actions.COLLAPSE_DEVICE,
      deviceId: 7,
    });
    expect(collapsed.expandedIds.has(7)).toBe(false);
  });

  test("TOGGLE_DEVICE_EXPANDED flips membership", () => {
    const s1 = deviceListReducer(baseState(), {
      type: actions.TOGGLE_DEVICE_EXPANDED,
      deviceId: 3,
    });
    expect(s1.expandedIds.has(3)).toBe(true);
    const s2 = deviceListReducer(s1, {
      type: actions.TOGGLE_DEVICE_EXPANDED,
      deviceId: 3,
    });
    expect(s2.expandedIds.has(3)).toBe(false);
  });

  test("OPEN/CLOSE_ADD_MGMT_DOMAIN_MODAL round-trip", () => {
    const opened = deviceListReducer(baseState(), {
      type: actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL,
      isOpen: true,
      deviceA: "host-1",
      deviceBCandidates: [dev(2)],
    });
    expect(opened.addMgmtDomainModal.isOpen).toBe(true);
    expect(opened.addMgmtDomainModal.deviceA).toBe("host-1");
    expect(opened.addMgmtDomainModal.deviceBCandidates).toHaveLength(1);
    const closed = deviceListReducer(opened, {
      type: actions.TOGGLE_ADD_MGMT_DOMAIN_MODAL,
      isOpen: false,
    });
    expect(closed.addMgmtDomainModal.isOpen).toBe(false);
    expect(closed.addMgmtDomainModal.deviceA).toBeNull();
    expect(closed.addMgmtDomainModal.deviceBCandidates).toEqual([]);
  });

  test("OPEN/CLOSE_DELETE_MODAL round-trip", () => {
    const opened = deviceListReducer(baseState(), {
      type: actions.TOGGLE_DELETE_MODAL,
      isOpen: true,
      device: dev(5),
    });
    expect(opened.deleteModal.isOpen).toBe(true);
    expect(opened.deleteModal.device?.id).toBe(5);
    const closed = deviceListReducer(opened, {
      type: actions.TOGGLE_DELETE_MODAL,
      isOpen: false,
    });
    expect(closed.deleteModal.isOpen).toBe(false);
    expect(closed.deleteModal.device).toBeNull();
  });

  test("OPEN/CLOSE_DEVICE_STATE_MODAL round-trip", () => {
    const opened = deviceListReducer(baseState(), {
      type: actions.TOGGLE_DEVICE_STATE_MODAL,
      isOpen: true,
      hostname: "host-7",
      deviceId: 7,
      newState: "MANAGED",
    });
    expect(opened.deviceStateModal.isOpen).toBe(true);
    expect(opened.deviceStateModal.deviceId).toBe(7);
    expect(opened.deviceStateModal.newState).toBe("MANAGED");
    const closed = deviceListReducer(opened, {
      type: actions.TOGGLE_DEVICE_STATE_MODAL,
      isOpen: false,
    });
    expect(closed.deviceStateModal.isOpen).toBe(false);
    expect(closed.deviceStateModal.deviceId).toBeNull();
    expect(closed.deviceStateModal.newState).toBeNull();
  });

  test("OPEN/CLOSE_UPDATE_MGMT_DOMAIN_MODAL round-trip", () => {
    const opened = deviceListReducer(baseState(), {
      type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL,
      isOpen: true,
      mgmtId: 99,
      deviceA: "host-a",
      deviceB: "host-b",
      ipv4Initial: "10.0.0.1",
      ipv6Initial: "::1",
      vlanInitial: 100,
    });
    expect(opened.updateMgmtDomainModal.isOpen).toBe(true);
    expect(opened.updateMgmtDomainModal.mgmtId).toBe(99);
    expect(opened.updateMgmtDomainModal.vlanInitial).toBe(100);
    const closed = deviceListReducer(opened, {
      type: actions.TOGGLE_UPDATE_MGMT_DOMAIN_MODAL,
      isOpen: false,
    });
    expect(closed.updateMgmtDomainModal.isOpen).toBe(false);
    expect(closed.updateMgmtDomainModal.mgmtId).toBeNull();
  });

  test("OPEN/CLOSE_SHOW_CONFIG_MODAL round-trip", () => {
    const opened = deviceListReducer(baseState(), {
      type: actions.TOGGLE_SHOW_CONFIG_MODAL,
      isOpen: true,
      hostname: "host-3",
      state: "MANAGED",
    });
    expect(opened.showConfigModal.isOpen).toBe(true);
    expect(opened.showConfigModal.hostname).toBe("host-3");
    const closed = deviceListReducer(opened, {
      type: actions.TOGGLE_SHOW_CONFIG_MODAL,
      isOpen: false,
    });
    expect(closed.showConfigModal.isOpen).toBe(false);
    expect(closed.showConfigModal.hostname).toBeNull();
  });

  test("OPEN/CLOSE_CHANGE_HOSTNAME_MODAL round-trip", () => {
    const opened = deviceListReducer(baseState(), {
      type: actions.TOGGLE_CHANGE_HOSTNAME_MODAL,
      isOpen: true,
      deviceId: 11,
      hostname: "host-11",
    });
    expect(opened.changeHostnameModal.isOpen).toBe(true);
    expect(opened.changeHostnameModal.deviceId).toBe(11);
    expect(opened.changeHostnameModal.hostname).toBe("host-11");
    const closed = deviceListReducer(opened, {
      type: actions.TOGGLE_CHANGE_HOSTNAME_MODAL,
      isOpen: false,
    });
    expect(closed.changeHostnameModal.isOpen).toBe(false);
    expect(closed.changeHostnameModal.deviceId).toBeNull();
    expect(closed.changeHostnameModal.hostname).toBeNull();
  });
});
