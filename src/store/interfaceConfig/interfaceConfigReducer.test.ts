import {
  interfaceConfigReducer as reducer,
  initialState,
  actions,
  type Device,
  type InterfaceConfigState,
  type Action,
} from "./interfaceConfigReducer";

describe("interfaceConfigReducer", () => {
  // --- Data loading ---

  describe("DEVICE_LOADED", () => {
    test("sets device and synchronized from device data", () => {
      const device = { id: 1, hostname: "sw1", synchronized: true } as Device;
      const result = reducer(initialState, {
        type: actions.DEVICE_LOADED,
        device,
      });

      expect(result.device).toBe(device);
      expect(result.synchronized).toBe(true);
    });

    test("sets synchronized to null when device is null", () => {
      const result = reducer(initialState, {
        type: actions.DEVICE_LOADED,
        device: null,
      });

      expect(result.device).toBeNull();
      expect(result.synchronized).toBeNull();
    });
  });

  describe("SETTINGS_LOADED", () => {
    test("sets settings and field options", () => {
      const result = reducer(initialState, {
        type: actions.SETTINGS_LOADED,
        settings: { vxlans: {} },
        vlans: [{ value: "vlan10", text: "vlan10" }],
        untaggedVlans: [{ value: "vlan10", text: "vlan10" }],
        tags: [{ text: "tagA", value: "tagA" }],
      });

      expect(result.settings).toEqual({ vxlans: {} });
      expect(result.vlans).toHaveLength(1);
      expect(result.untaggedVlans).toHaveLength(1);
      expect(result.tags).toEqual([{ text: "tagA", value: "tagA" }]);
    });

    test("merges tags with existing tags", () => {
      const state = {
        ...initialState,
        tags: [{ text: "existing", value: "existing" }],
      };
      const result = reducer(state, {
        type: actions.SETTINGS_LOADED,
        settings: {},
        vlans: [],
        untaggedVlans: [],
        tags: [
          { text: "existing", value: "existing" },
          { text: "new", value: "new" },
        ],
      });

      expect(result.tags).toHaveLength(2);
      expect(result.tags.map((t) => t.text)).toEqual(["existing", "new"]);
    });
  });

  describe("INTERFACES_LOADED", () => {
    test("sets interfaces and merges tags", () => {
      const state = { ...initialState, tags: [{ text: "old", value: "old" }] };
      const result = reducer(state, {
        type: actions.INTERFACES_LOADED,
        interfaces: [{ name: "Ethernet1" }],
        tags: [{ text: "new", value: "new" }],
      });

      expect(result.interfaces).toEqual([{ name: "Ethernet1" }]);
      expect(result.tags).toHaveLength(2);
    });

    test("sets mlagPeerHostname when provided", () => {
      const result = reducer(initialState, {
        type: actions.INTERFACES_LOADED,
        interfaces: [],
        tags: [],
        mlagPeerHostname: "sw2",
      });

      expect(result.mlagPeerHostname).toBe("sw2");
    });

    test("preserves existing mlagPeerHostname when not provided", () => {
      const state = { ...initialState, mlagPeerHostname: "sw2" };
      const result = reducer(state, {
        type: actions.INTERFACES_LOADED,
        interfaces: [],
        tags: [],
      });

      expect(result.mlagPeerHostname).toBe("sw2");
    });

    test("sets portTemplates when provided", () => {
      const result = reducer(initialState, {
        type: actions.INTERFACES_LOADED,
        interfaces: [],
        tags: [],
        portTemplates: [{ text: "tmpl", value: "tmpl" }],
      });

      expect(result.portTemplates).toHaveLength(1);
    });
  });

  describe("INTERFACE_STATUS_LOADED", () => {
    test("sets interface status", () => {
      const status = { Ethernet1: { is_up: true } };
      const result = reducer(initialState, {
        type: actions.INTERFACE_STATUS_LOADED,
        interfaceStatus: status,
      });

      expect(result.interfaceStatus).toBe(status);
    });
  });

  describe("LLDP_LOADED", () => {
    test("sets lldp neighbors", () => {
      const neighbors = { ethernet1: [{ neighbor: "sw2" }] };
      const result = reducer(initialState, {
        type: actions.LLDP_LOADED,
        lldpNeighbors: neighbors,
      });

      expect(result.lldpNeighbors).toBe(neighbors);
    });
  });

  describe("NETBOX_LOADED", () => {
    test("sets netbox data", () => {
      const result = reducer(initialState, {
        type: actions.NETBOX_LOADED,
        netboxDevice: { id: 10 },
        netboxInterfaces: [{ name: "eth0" }],
        netboxModel: { model: "vEOS" },
      });

      expect(result.netboxDevice).toEqual({ id: 10 });
      expect(result.netboxInterfaces).toEqual([{ name: "eth0" }]);
      expect(result.netboxModel).toEqual({ model: "vEOS" });
    });

    test("preserves existing netbox data for missing fields", () => {
      const state = {
        ...initialState,
        netboxDevice: { id: 10 },
        netboxInterfaces: [{ name: "eth0" }],
        netboxModel: { model: "vEOS" },
      };
      const result = reducer(state, {
        type: actions.NETBOX_LOADED,
        netboxDevice: null,
      });

      expect(result.netboxDevice).toEqual({ id: 10 });
      expect(result.netboxInterfaces).toEqual([{ name: "eth0" }]);
      expect(result.netboxModel).toEqual({ model: "vEOS" });
    });
  });

  // --- Edit actions ---

  describe("UPDATE_FIELD", () => {
    test("adds a changed field", () => {
      const result = reducer(initialState, {
        type: actions.UPDATE_FIELD,
        interfaceName: "Ethernet1",
        field: "description",
        value: "uplink",
        defaultValue: "",
      });

      expect(result.interfaceDataUpdated).toEqual({
        Ethernet1: { description: "uplink" },
      });
    });

    test("removes field when value matches default", () => {
      const state = {
        ...initialState,
        interfaceDataUpdated: { Ethernet1: { description: "uplink" } },
      };
      const result = reducer(state, {
        type: actions.UPDATE_FIELD,
        interfaceName: "Ethernet1",
        field: "description",
        value: "",
        defaultValue: "",
      });

      expect(result.interfaceDataUpdated).toEqual({});
    });

    test("removes interface entry when last field is reverted", () => {
      const state = {
        ...initialState,
        interfaceDataUpdated: { Ethernet1: { description: "uplink" } },
      };
      const result = reducer(state, {
        type: actions.UPDATE_FIELD,
        interfaceName: "Ethernet1",
        field: "description",
        value: "",
        defaultValue: "",
      });

      expect(result.interfaceDataUpdated.Ethernet1).toBeUndefined();
    });

    test("keeps other fields when one is reverted", () => {
      const state = {
        ...initialState,
        interfaceDataUpdated: {
          Ethernet1: { description: "uplink", enabled: false },
        },
      };
      const result = reducer(state, {
        type: actions.UPDATE_FIELD,
        interfaceName: "Ethernet1",
        field: "description",
        value: "",
        defaultValue: "",
      });

      expect(result.interfaceDataUpdated).toEqual({
        Ethernet1: { enabled: false },
      });
    });

    test("clears port_template when ifclass changes away from port_template", () => {
      const state = {
        ...initialState,
        interfaceDataUpdated: {
          Ethernet1: { ifclass: "port_template", port_template: "tmpl1" },
        },
      };
      const result = reducer(state, {
        type: actions.UPDATE_FIELD,
        interfaceName: "Ethernet1",
        field: "ifclass",
        value: "custom",
        defaultValue: "port_template",
      });

      expect(
        result.interfaceDataUpdated.Ethernet1.port_template,
      ).toBeUndefined();
      expect(result.interfaceDataUpdated.Ethernet1.ifclass).toBe("custom");
    });
  });

  describe("TOGGLE_UNTAGGED", () => {
    test("sets untagged to true", () => {
      const result = reducer(initialState, {
        type: actions.TOGGLE_UNTAGGED,
        interfaceName: "Ethernet1",
        untagged: true,
      });

      expect(result.interfaceToggleUntagged).toEqual({ Ethernet1: true });
    });

    test("removes toggle when set to false", () => {
      const state = {
        ...initialState,
        interfaceToggleUntagged: { Ethernet1: true },
      };
      const result = reducer(state, {
        type: actions.TOGGLE_UNTAGGED,
        interfaceName: "Ethernet1",
        untagged: false,
      });

      expect(result.interfaceToggleUntagged).toEqual({});
    });
  });

  describe("ADD_TAG_OPTION", () => {
    test("appends a new tag", () => {
      const result = reducer(initialState, {
        type: actions.ADD_TAG_OPTION,
        tag: "newTag",
      });

      expect(result.tags).toEqual([{ text: "newTag", value: "newTag" }]);
    });
  });

  describe("ADD_PORT_TEMPLATE_OPTION", () => {
    test("appends a new port template", () => {
      const result = reducer(initialState, {
        type: actions.ADD_PORT_TEMPLATE_OPTION,
        template: "newTmpl",
      });

      expect(result.portTemplates).toEqual([
        { text: "newTmpl", value: "newTmpl" },
      ]);
    });
  });

  describe("ADD_NEW_INTERFACE", () => {
    test("appends a stub custom interface", () => {
      const state = {
        ...initialState,
        interfaces: [{ name: "Ethernet1" }],
      };
      const result = reducer(state, {
        type: actions.ADD_NEW_INTERFACE,
        interfaceName: "Ethernet99",
      });

      expect(result.interfaces).toHaveLength(2);
      expect(result.interfaces[1]).toEqual({
        name: "Ethernet99",
        ifclass: "custom",
        tags: null,
      });
    });
  });

  describe("SET_DISPLAY_COLUMNS", () => {
    test("sets display columns", () => {
      const result = reducer(initialState, {
        type: actions.SET_DISPLAY_COLUMNS,
        columns: ["vlans", "tags"],
      });

      expect(result.displayColumns).toEqual(["vlans", "tags"]);
    });
  });

  // --- Socket / sync ---

  describe("DEVICE_UPDATED", () => {
    test("updates synchronized state", () => {
      const result = reducer(initialState, {
        type: actions.DEVICE_UPDATED,
        synchronized: false,
      });

      expect(result.synchronized).toBe(false);
    });
  });

  describe("MARK_THIRD_PARTY_UPDATE", () => {
    test("sets thirdPartyUpdate to true", () => {
      const result = reducer(initialState, {
        type: actions.MARK_THIRD_PARTY_UPDATE,
      });

      expect(result.thirdPartyUpdate).toBe(true);
    });
  });

  describe("CLEAR_THIRD_PARTY_UPDATE", () => {
    test("sets thirdPartyUpdate to false", () => {
      const state = { ...initialState, thirdPartyUpdate: true };
      const result = reducer(state, {
        type: actions.CLEAR_THIRD_PARTY_UPDATE,
      });

      expect(result.thirdPartyUpdate).toBe(false);
    });
  });

  // --- Job tracking ---

  describe("JOB_STARTED", () => {
    test("sets isWorking and creates first job entry", () => {
      const result = reducer(initialState, {
        type: actions.JOB_STARTED,
        jobId: 42,
      });

      expect(result.isWorking).toBe(true);
      expect(result.autoPushJobs).toEqual([{ job_id: 42, status: "RUNNING" }]);
      expect(result.ownUpdateInProgress).toBe(true);
    });
  });

  describe("JOB_UPDATED", () => {
    test("adds second job when first job has next_job_id", () => {
      const state = {
        ...initialState,
        autoPushJobs: [{ job_id: 42, status: "RUNNING" }],
      };
      const result = reducer(state, {
        type: actions.JOB_UPDATED,
        jobData: { job_id: 42, status: "FINISHED", next_job_id: 43 },
      });

      expect(result.autoPushJobs).toHaveLength(2);
      expect(result.autoPushJobs[0].job_id).toBe(42);
      expect(result.autoPushJobs[1]).toEqual({
        job_id: 43,
        status: "RUNNING",
      });
    });

    test("stops working when first job finishes without next_job_id", () => {
      const state = {
        ...initialState,
        isWorking: true,
        autoPushJobs: [{ job_id: 42, status: "RUNNING" }],
      };
      const result = reducer(state, {
        type: actions.JOB_UPDATED,
        jobData: { job_id: 42, status: "FINISHED" },
      });

      expect(result.isWorking).toBe(false);
      expect(result.autoPushJobs).toEqual([{ job_id: 42, status: "FINISHED" }]);
    });

    test("stops working when first job hits EXCEPTION", () => {
      const state = {
        ...initialState,
        isWorking: true,
        autoPushJobs: [{ job_id: 42, status: "RUNNING" }],
      };
      const result = reducer(state, {
        type: actions.JOB_UPDATED,
        jobData: { job_id: 42, status: "EXCEPTION" },
      });

      expect(result.isWorking).toBe(false);
    });

    test("updates second job status", () => {
      const state = {
        ...initialState,
        isWorking: true,
        autoPushJobs: [
          { job_id: 42, status: "FINISHED" },
          { job_id: 43, status: "RUNNING" },
        ],
      };
      const result = reducer(state, {
        type: actions.JOB_UPDATED,
        jobData: { job_id: 43, status: "FINISHED" },
      });

      expect(result.autoPushJobs[1].status).toBe("FINISHED");
      expect(result.isWorking).toBe(false);
      expect(result.interfaceDataUpdated).toEqual({});
    });

    test("clears edit state when second job finishes", () => {
      const state = {
        ...initialState,
        isWorking: true,
        interfaceDataUpdated: { Ethernet1: { description: "x" } },
        autoPushJobs: [
          { job_id: 42, status: "FINISHED" },
          { job_id: 43, status: "RUNNING" },
        ],
      };
      const result = reducer(state, {
        type: actions.JOB_UPDATED,
        jobData: { job_id: 43, status: "FINISHED" },
      });

      expect(result.interfaceDataUpdated).toEqual({});
    });

    test("ignores unrelated job updates", () => {
      const state = {
        ...initialState,
        autoPushJobs: [{ job_id: 42, status: "RUNNING" }],
      };
      const result = reducer(state, {
        type: actions.JOB_UPDATED,
        jobData: { job_id: 999, status: "FINISHED" },
      });

      expect(result).toBe(state);
    });
  });

  // --- Save lifecycle ---

  describe("SAVE_STARTED", () => {
    test("sets isWorking to true", () => {
      const result = reducer(initialState, { type: actions.SAVE_STARTED });
      expect(result.isWorking).toBe(true);
    });
  });

  describe("SAVE_FAILED", () => {
    test("sets isWorking to false", () => {
      const state = { ...initialState, isWorking: true };
      const result = reducer(state, { type: actions.SAVE_FAILED });
      expect(result.isWorking).toBe(false);
    });
  });

  describe("SAVE_COMPLETED", () => {
    test("clears edit state", () => {
      const state = {
        ...initialState,
        interfaceDataUpdated: { Ethernet1: { description: "x" } },
      };
      const result = reducer(state, { type: actions.SAVE_COMPLETED });
      expect(result.interfaceDataUpdated).toEqual({});
    });
  });

  // --- Bounce ---

  describe("BOUNCE_STARTED", () => {
    test("marks interface as running", () => {
      const result = reducer(initialState, {
        type: actions.BOUNCE_STARTED,
        interfaceName: "Ethernet1",
      });

      expect(result.interfaceBounceRunning).toEqual({ Ethernet1: "running" });
    });
  });

  describe("BOUNCE_FINISHED", () => {
    test("sets bounce result", () => {
      const state = {
        ...initialState,
        interfaceBounceRunning: { Ethernet1: "running" },
      };
      const result = reducer(state, {
        type: actions.BOUNCE_FINISHED,
        interfaceName: "Ethernet1",
        result: "finished",
      });

      expect(result.interfaceBounceRunning).toEqual({
        Ethernet1: "finished",
      });
    });

    test("sets bounce error", () => {
      const result = reducer(initialState, {
        type: actions.BOUNCE_FINISHED,
        interfaceName: "Ethernet1",
        result: "error: timeout",
      });

      expect(result.interfaceBounceRunning.Ethernet1).toBe("error: timeout");
    });
  });

  // --- Reload ---

  describe("RELOAD_ALL", () => {
    test("clears thirdPartyUpdate and edit state", () => {
      const state = {
        ...initialState,
        thirdPartyUpdate: true,
        interfaceDataUpdated: { Ethernet1: { description: "x" } },
      };
      const result = reducer(state, { type: actions.RELOAD_ALL });

      expect(result.thirdPartyUpdate).toBe(false);
      expect(result.interfaceDataUpdated).toEqual({});
    });

    test("clears ownUpdateInProgress", () => {
      const state = {
        ...initialState,
        ownUpdateInProgress: true,
      };
      const result = reducer(state, { type: actions.RELOAD_ALL });

      expect(result.ownUpdateInProgress).toBe(false);
    });

    test("preserves other state", () => {
      const state = {
        ...initialState,
        device: { id: 1 } as Device,
        interfaces: [{ name: "Ethernet1" }],
        thirdPartyUpdate: true,
      } as InterfaceConfigState;
      const result = reducer(state, { type: actions.RELOAD_ALL });

      expect(result.device).toEqual({ id: 1 });
      expect(result.interfaces).toHaveLength(1);
    });
  });

  // --- Unknown action ---

  test("throws on unknown action", () => {
    expect(() => {
      reducer(initialState, { type: "BOGUS" } as unknown as Action);
    }).toThrow("Unknown action: BOGUS");
  });
});
