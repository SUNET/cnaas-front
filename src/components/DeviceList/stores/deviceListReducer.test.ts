import type { Device } from "../../../types/device";
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

const dev = (id: number, overrides: Partial<Device> = {}): Device => ({
  id,
  hostname: `host-${id}`,
  device_type: "ACCESS",
  state: "MANAGED",
  synchronized: true,
  ...overrides,
});

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

  test("CACHE_INTERFACES adds and REMOVE_INTERFACES drops the entry", () => {
    let state = deviceListReducer(baseState(), {
      type: actions.CACHE_INTERFACES,
      hostname: "host-1",
      interfaces: [],
    });
    expect(state.deviceInterfaceData["host-1"]).toEqual([]);
    state = deviceListReducer(state, {
      type: actions.REMOVE_INTERFACES,
      hostname: "host-1",
    });
    expect("host-1" in state.deviceInterfaceData).toBe(false);
  });

  test("REMOVE_INTERFACES on missing hostname returns same reference", () => {
    const start = baseState();
    const next = deviceListReducer(start, {
      type: actions.REMOVE_INTERFACES,
      hostname: "nope",
    });
    expect(next).toBe(start);
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

  test("CHAIN_DEVICE_NEXT_JOB only chains devices whose first job matches", () => {
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
      hostname: "host-1",
      data: { y: 2 },
    });
    expect(state.netboxModelData.ABC).toEqual({ x: 1 });
    expect(state.netboxDeviceData["host-1"]).toEqual({ y: 2 });
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
});
