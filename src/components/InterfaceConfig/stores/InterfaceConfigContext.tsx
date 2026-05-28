import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
  type MutableRefObject,
  type Dispatch,
} from "react";
import { useAuthToken } from "../../../contexts/AuthTokenContext";
import { useFreshRef } from "../../../hooks/useFreshRef";
import { fetchDevice } from "../../../services/deviceApi";
import {
  fetchNetboxDevice,
  fetchNetboxInterfaces,
  fetchNetboxModel,
} from "../../../services/netbox";
import {
  fetchDeviceById,
  fetchInterfaceStatus,
  fetchLldpNeighbors,
  fetchAccessInterfaces,
  fetchDistInterfaces,
  saveInterfaces as apiSaveInterfaces,
  startAutoPush as apiStartAutoPush,
  bounceInterface as apiBounceInterface,
  exportInterfaces as apiExportInterfaces,
} from "../api/deviceApi";
import { fetchDeviceSettings } from "../api/settingsApi";
import { fetchLinknets } from "../api/linknetsApi";
import {
  interfaceConfigReducer,
  initialState,
  actions,
  type InterfaceConfigState,
  type Action,
} from "./interfaceConfigReducer";
import { computeLinknetMismatches } from "./linknetVerification";
import type { Linknet } from "../../../types/linknet";

// --- Context shape ---

export type InterfaceConfigContextValue = {
  state: InterfaceConfigState;
  dispatch: Dispatch<Action>;
  awaitingSync: MutableRefObject<boolean>;

  reloadAllData: () => void;
  refreshInterfaceStatus: () => void;
  loadInterfaces: () => Promise<void>;

  updateField: (
    interfaceName: string,
    field: string,
    value: unknown,
    defaultValue: unknown,
  ) => void;
  toggleUntagged: (interfaceName: string, untagged: boolean) => void;
  addTagOption: (tag: string) => void;
  addPortTemplateOption: (template: string) => void;
  addNewInterface: (interfaceName: string) => void;
  setDisplayColumns: (columns: string[]) => void;

  saveInterfaces: (
    sendData: unknown,
  ) => Promise<{ success: boolean; error?: string }>;
  startAutoPush: () => Promise<void>;
  bounceInterface: (interfaceName: string) => Promise<void>;
  exportInterfaces: (hostname: string) => Promise<void>;
  verifyLinknets: () => Promise<void>;
};

// --- Context ---

const InterfaceConfigContext =
  createContext<InterfaceConfigContextValue | null>(null);

export function useInterfaceConfig(): InterfaceConfigContextValue {
  const ctx = useContext(InterfaceConfigContext);
  if (!ctx) {
    throw new Error(
      "useInterfaceConfig must be used within InterfaceConfigProvider",
    );
  }
  return ctx;
}

// --- Provider ---

type InterfaceConfigProviderProps = {
  readonly hostname: string;
  readonly children: ReactNode;
};

export function InterfaceConfigProvider({
  hostname,
  children,
}: InterfaceConfigProviderProps) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);
  const [state, dispatch] = useReducer(interfaceConfigReducer, initialState);

  const awaitingSync = useRef(false);

  const { device } = state;
  const deviceType = device?.device_type ?? null;
  const deviceModel = device?.model ?? null;

  // --- Data fetching ---

  const loadDevice = useCallback(async () => {
    if (!hostname) return;
    const device = await fetchDevice(hostname, tokenRef.current);
    dispatch({ type: actions.DEVICE_LOADED, device });
  }, [hostname, tokenRef]);

  const loadSettings = useCallback(async () => {
    if (!hostname) return;
    const result = await fetchDeviceSettings(hostname, tokenRef.current);
    if (!result) return;
    dispatch({
      type: actions.SETTINGS_LOADED,
      ...result,
    } as Action);
  }, [hostname, tokenRef]);

  const loadInterfaceStatus = useCallback(async () => {
    if (!hostname) return;
    const interfaceStatus = await fetchInterfaceStatus(
      hostname,
      tokenRef.current,
    );
    dispatch({ type: actions.INTERFACE_STATUS_LOADED, interfaceStatus });
  }, [hostname, tokenRef]);

  const loadLldpNeighbors = useCallback(async () => {
    if (!hostname) return;
    const lldpNeighbors = await fetchLldpNeighbors(hostname, tokenRef.current);
    dispatch({ type: actions.LLDP_LOADED, lldpNeighbors });
  }, [hostname, tokenRef]);

  const loadInterfaces = useCallback(async () => {
    if (!hostname || !deviceType) return;

    switch (deviceType) {
      case "ACCESS": {
        const result = await fetchAccessInterfaces(hostname, tokenRef.current);
        if (!result) return;
        dispatch({
          type: actions.INTERFACES_LOADED,
          interfaces: result.interfaces,
          tags: result.tags,
          mlagPeerHostname: result.mlagPeerHostname,
        });
        break;
      }
      case "DIST": {
        const result = await fetchDistInterfaces(hostname, tokenRef.current);
        if (!result) return;
        // Extract unique VLAN range strings from tagged_vlan_list
        const seenRanges = new Set<string>();
        for (const iface of result.interfaces) {
          const list = iface.tagged_vlan_list;
          if (!Array.isArray(list)) continue;
          for (const item of list) {
            if (typeof item === "string" && /^\d+-\d+$/.test(item)) {
              seenRanges.add(item);
            }
          }
        }
        dispatch({
          type: actions.INTERFACES_LOADED,
          interfaces: result.interfaces,
          tags: result.tags,
          portTemplates: result.portTemplates,
          vlanRanges: seenRanges,
        });
        break;
      }
      default:
        break;
    }
  }, [hostname, deviceType, tokenRef]);

  const loadNetbox = useCallback(async () => {
    if (!hostname || !deviceType) return;
    const token = tokenRef.current;
    if (!token) return;

    const [netboxDevice, netboxModel] = await Promise.all([
      fetchNetboxDevice(hostname, token),
      deviceModel ? fetchNetboxModel(deviceModel as string, token) : null,
    ]);

    const netboxInterfaces = netboxDevice
      ? await fetchNetboxInterfaces(netboxDevice.id, token)
      : [];

    dispatch({
      type: actions.NETBOX_LOADED,
      netboxDevice,
      netboxInterfaces,
      netboxModel,
    });
  }, [hostname, deviceType, deviceModel, tokenRef, dispatch]);

  // --- Effects: initial data loading ---

  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  useEffect(() => {
    if (!hostname) return;
    loadSettings();
  }, [hostname, loadSettings]);

  useEffect(() => {
    if (!deviceType) return;
    loadInterfaces();
    loadInterfaceStatus();
    loadLldpNeighbors();
  }, [deviceType, loadInterfaces, loadInterfaceStatus, loadLldpNeighbors]);

  useEffect(() => {
    loadNetbox();
  }, [loadNetbox]);

  // --- Column preferences (from localStorage) ---

  useEffect(() => {
    if (!deviceType) return;

    const stored = JSON.parse(
      localStorage.getItem("interfaceConfig") ?? "{}",
    ) as Record<string, string[]>;
    const key =
      deviceType === "ACCESS" ? "accessDisplayColumns" : "distDisplayColumns";

    const validColumns = new Set([
      "vlans",
      "tags",
      "json",
      "aggregate_id",
      "bpdu_filter",
      "config",
    ]);
    const columns = (stored[key] ?? ["vlans"]).filter((c: string) =>
      validColumns.has(c),
    );

    dispatch({ type: actions.SET_DISPLAY_COLUMNS, columns });
  }, [deviceType]);

  // --- Named actions ---

  const reloadAllData = useCallback(() => {
    dispatch({ type: actions.RELOAD_ALL });
    loadDevice();
    loadSettings();
    loadInterfaces();
    loadInterfaceStatus();
    loadLldpNeighbors();
  }, [
    loadDevice,
    loadSettings,
    loadInterfaces,
    loadInterfaceStatus,
    loadLldpNeighbors,
  ]);

  const refreshInterfaceStatus = useCallback(() => {
    loadInterfaceStatus();
    loadLldpNeighbors();
  }, [loadInterfaceStatus, loadLldpNeighbors]);

  const updateField = useCallback(
    (
      interfaceName: string,
      field: string,
      value: unknown,
      defaultValue: unknown,
    ) => {
      dispatch({
        type: actions.UPDATE_FIELD,
        interfaceName,
        field,
        value,
        defaultValue,
      });
    },
    [],
  );

  const toggleUntagged = useCallback(
    (interfaceName: string, untagged: boolean) => {
      dispatch({ type: actions.TOGGLE_UNTAGGED, interfaceName, untagged });
    },
    [],
  );

  const addTagOption = useCallback((tag: string) => {
    dispatch({ type: actions.ADD_TAG_OPTION, tag });
  }, []);

  const addPortTemplateOption = useCallback((template: string) => {
    dispatch({ type: actions.ADD_PORT_TEMPLATE_OPTION, template });
  }, []);

  const addNewInterface = useCallback((interfaceName: string) => {
    dispatch({ type: actions.ADD_NEW_INTERFACE, interfaceName });
  }, []);

  const setDisplayColumns = useCallback(
    (columns: string[]) => {
      dispatch({ type: actions.SET_DISPLAY_COLUMNS, columns });

      // Persist to localStorage
      const stored = JSON.parse(
        localStorage.getItem("interfaceConfig") ?? "{}",
      ) as Record<string, string[]>;
      const key =
        deviceType === "ACCESS" ? "accessDisplayColumns" : "distDisplayColumns";
      stored[key] = columns;
      localStorage.setItem("interfaceConfig", JSON.stringify(stored));
    },
    [deviceType],
  );

  const saveInterfaces = useCallback(
    async (
      sendData: unknown,
    ): Promise<{ success: boolean; error?: string }> => {
      dispatch({ type: actions.SAVE_STARTED });
      const result = await apiSaveInterfaces(
        hostname ?? "",
        sendData,
        tokenRef.current,
      );
      if (!result.success) dispatch({ type: actions.SAVE_FAILED });
      return result;
    },
    [hostname, tokenRef],
  );

  const startAutoPush = useCallback(async () => {
    try {
      const { jobId } = await apiStartAutoPush(hostname, tokenRef.current);
      dispatch({ type: actions.JOB_STARTED, jobId });
    } catch (error) {
      console.error("Failed to start autopush:", error);
      dispatch({ type: actions.SAVE_FAILED });
    }
  }, [hostname, tokenRef]);

  const bounceInterface = useCallback(
    async (interfaceName: string) => {
      dispatch({ type: actions.BOUNCE_STARTED, interfaceName });
      const result = await apiBounceInterface(
        hostname,
        interfaceName,
        tokenRef.current,
      );
      dispatch({
        type: actions.BOUNCE_FINISHED,
        interfaceName,
        result: result.success ? "finished" : `error: ${result.error}`,
      });
    },
    [hostname, tokenRef],
  );

  const exportInterfaces = useCallback(
    async (exportHostname: string) => {
      try {
        const blob = await apiExportInterfaces(
          exportHostname,
          tokenRef.current,
        );
        const url = globalThis.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${exportHostname}_interfaces.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        globalThis.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Export failed:", error);
      }
    },
    [tokenRef],
  );

  const verifyLinknets = useCallback(async () => {
    if (!device) return;
    const token = tokenRef.current;
    if (!token) return;

    const allLinknets = await fetchLinknets(token);

    // Filter to linknets involving this device
    const relevantLinknets = (allLinknets as Linknet[]).filter(
      (ln) => ln.device_a_id === device.id || ln.device_b_id === device.id,
    );

    // Collect all device IDs we need to resolve to hostnames
    const otherDeviceIds = new Set<number>();
    for (const ln of relevantLinknets) {
      otherDeviceIds.add(
        ln.device_a_id === device.id ? ln.device_b_id : ln.device_a_id,
      );
    }
    for (const iface of state.interfaces) {
      const neighborId = iface.data?.neighbor_id as number | undefined;
      if (neighborId != null) {
        otherDeviceIds.add(neighborId);
      }
    }

    // Fetch hostnames for all referenced device IDs
    const deviceMap = new Map<number, string>();
    await Promise.all(
      [...otherDeviceIds].map(async (id) => {
        const dev = await fetchDeviceById(id, token);
        if (dev?.hostname) {
          deviceMap.set(id, dev.hostname);
        }
      }),
    );

    const { mismatches, checkedPorts } = computeLinknetMismatches(
      device.id,
      state.interfaces,
      state.lldpNeighbors,
      relevantLinknets,
      deviceMap,
    );

    dispatch({
      type: actions.LINKNET_MISMATCHES_LOADED,
      mismatches,
      checkedPorts,
    });
  }, [device, state.interfaces, state.lldpNeighbors, tokenRef, dispatch]);

  // --- Context value ---

  const value = useMemo(
    (): InterfaceConfigContextValue => ({
      state,
      dispatch,
      awaitingSync,

      // Data loading
      reloadAllData,
      refreshInterfaceStatus,
      loadInterfaces,

      // Edit actions
      updateField,
      toggleUntagged,
      addTagOption,
      addPortTemplateOption,
      addNewInterface,
      setDisplayColumns,

      // Async actions
      saveInterfaces,
      startAutoPush,
      bounceInterface,
      exportInterfaces,
      verifyLinknets,
    }),
    [
      state,
      reloadAllData,
      refreshInterfaceStatus,
      loadInterfaces,
      updateField,
      toggleUntagged,
      addTagOption,
      addPortTemplateOption,
      addNewInterface,
      setDisplayColumns,
      saveInterfaces,
      startAutoPush,
      bounceInterface,
      exportInterfaces,
      verifyLinknets,
    ],
  );

  return (
    <InterfaceConfigContext.Provider value={value}>
      {children}
    </InterfaceConfigContext.Provider>
  );
}
