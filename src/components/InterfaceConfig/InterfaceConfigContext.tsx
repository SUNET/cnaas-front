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
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { useFreshRef } from "../../hooks/useFreshRef";
import {
  fetchDevice,
  fetchDeviceSettings,
  fetchInterfaceStatus,
  fetchLldpNeighbors,
  fetchAccessInterfaces,
  fetchDistInterfaces,
} from "../../services/deviceApi";
import {
  fetchNetboxDevice,
  fetchNetboxInterfaces,
  fetchNetboxModel,
} from "../../services/netbox";
import { putData, postData } from "../../utils/sendData";
import {
  interfaceConfigReducer,
  initialState,
  actions,
  type InterfaceConfigState,
  type Action,
  type InterfaceItem,
  type DropdownOption,
} from "./interfaceConfigReducer";

// --- Context shape ---

export interface InterfaceConfigContextValue {
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
}

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

interface InterfaceConfigProviderProps {
  hostname: string | null;
  children: ReactNode;
}

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
          interfaces: result.interfaces as InterfaceItem[],
          tags: result.tags as DropdownOption[],
          mlagPeerHostname: result.mlagPeerHostname,
        });
        break;
      }
      case "DIST": {
        const result = await fetchDistInterfaces(hostname, tokenRef.current);
        if (!result) return;
        dispatch({
          type: actions.INTERFACES_LOADED,
          interfaces: result.interfaces as InterfaceItem[],
          tags: result.tags as DropdownOption[],
          portTemplates: result.portTemplates as DropdownOption[],
        });
        break;
      }
      default:
        break;
    }
  }, [hostname, deviceType, tokenRef]);

  const loadNetbox = useCallback(async () => {
    if (!hostname || !deviceType) return;

    const [netboxDevice, netboxModel] = await Promise.all([
      fetchNetboxDevice(hostname),
      deviceModel ? fetchNetboxModel(deviceModel as string) : null,
    ]);

    const netboxInterfaces = netboxDevice
      ? await fetchNetboxInterfaces(netboxDevice.id)
      : [];

    dispatch({
      type: actions.NETBOX_LOADED,
      netboxDevice,
      netboxInterfaces,
      netboxModel,
    });
  }, [hostname, deviceType, deviceModel]);

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
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
        const data = await putData(url, tokenRef.current, sendData);
        if (data.status === "success") {
          return { success: true };
        }
        dispatch({ type: actions.SAVE_FAILED });
        return { success: false, error: data.message };
      } catch (error: unknown) {
        dispatch({ type: actions.SAVE_FAILED });
        const errObj = error as { message?: { errors?: string[] } };
        const errors = errObj?.message?.errors?.join(", ") ?? String(error);
        return { success: false, error: errors };
      }
    },
    [hostname, tokenRef],
  );

  const startAutoPush = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
      const body = {
        dry_run: true,
        comment: "interface update via WebUI",
        hostname,
        auto_push: true,
      };
      const data = await postData(url, tokenRef.current, body);
      dispatch({ type: actions.JOB_STARTED, jobId: data.job_id });
    } catch (error) {
      console.error("Failed to start autopush:", error);
      dispatch({ type: actions.SAVE_FAILED });
    }
  }, [hostname, tokenRef]);

  const bounceInterface = useCallback(
    async (interfaceName: string) => {
      dispatch({ type: actions.BOUNCE_STARTED, interfaceName });
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
        const body = { bounce_interfaces: [interfaceName] };
        const data = await putData(url, tokenRef.current, body);
        const result =
          data.status === "success" ? "finished" : `error: ${data.data}`;
        dispatch({ type: actions.BOUNCE_FINISHED, interfaceName, result });
      } catch (error) {
        dispatch({
          type: actions.BOUNCE_FINISHED,
          interfaceName,
          result: `error: ${error}`,
        });
      }
    },
    [hostname, tokenRef],
  );

  const exportInterfaces = useCallback(
    async (exportHostname: string) => {
      try {
        const response = await fetch(
          `${process.env.API_URL}/api/v1.0/device/${exportHostname}/interfaces_export`,
          { headers: { Authorization: `Bearer ${tokenRef.current}` } },
        );
        const blob = await response.blob();
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
    ],
  );

  return (
    <InterfaceConfigContext.Provider value={value}>
      {children}
    </InterfaceConfigContext.Provider>
  );
}
