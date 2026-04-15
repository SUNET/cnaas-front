import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { useFreshRef } from "./useFreshRef";
import {
  fetchDeviceSettings,
  fetchInterfaceStatus,
  fetchLldpNeighbors,
  fetchAccessInterfaces,
  fetchDistInterfaces,
} from "../services/deviceApi";

/**
 * Hook that manages interface config data fetching.
 *
 * Does NOT fetch core device data — use useDevice(hostname) for that.
 * Accepts deviceType to know which interface endpoints to call.
 *
 * Returns:
 * - settings: device configuration settings
 * - interfaces: { data, status, lldpNeighbors }
 * - fieldOptions: { vlans, untaggedVlans, tags, portTemplates }
 * - mlagPeerHostname, thirdPartyUpdate (overlay state)
 *
 * Netbox data is NOT included — fetch it separately via src/services/netbox.js.
 */
export function useDeviceInterfaceConfig(hostname, deviceType) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);

  const [deviceState, setDeviceState] = useState({
    settings: null,
    mlagPeerHostname: null,
    thirdPartyUpdate: false,
  });

  const [interfacesState, setInterfacesState] = useState({
    data: [],
    status: {},
    lldpNeighbors: {},
  });

  const [fieldOptionsState, setFieldOptionsState] = useState({
    vlans: [],
    untaggedVlans: [],
    tags: [],
    portTemplates: [],
  });

  const mlagPeerFoundRef = useRef(false);

  // --- Fetch-and-set wrappers ---

  const getDeviceSettings = useCallback(async () => {
    const result = await fetchDeviceSettings(hostname, tokenRef.current);
    if (!result) return;
    const { settings, vlans, untaggedVlans, tags } = result;
    setDeviceState((prev) => ({ ...prev, settings }));
    setFieldOptionsState((prev) => ({ ...prev, vlans, untaggedVlans, tags }));
  }, [hostname, tokenRef]);

  const getInterfaceStatusData = useCallback(async () => {
    const status = await fetchInterfaceStatus(hostname, tokenRef.current);
    setInterfacesState((prev) => ({ ...prev, status }));
  }, [hostname, tokenRef]);

  const getLldpNeighborData = useCallback(async () => {
    const lldpNeighbors = await fetchLldpNeighbors(hostname, tokenRef.current);
    setInterfacesState((prev) => ({ ...prev, lldpNeighbors }));
  }, [hostname, tokenRef]);

  const getInterfaceData = useCallback(async () => {
    switch (deviceType) {
      case "ACCESS": {
        const result = await fetchAccessInterfaces(hostname, tokenRef.current);
        if (!result) return;
        const { interfaces, tags, mlagPeerHostname } = result;
        setInterfacesState((prev) => ({ ...prev, data: interfaces }));
        setFieldOptionsState((prev) => ({
          ...prev,
          tags: mergeTags(prev.tags, tags),
        }));
        if (mlagPeerHostname && !mlagPeerFoundRef.current) {
          mlagPeerFoundRef.current = true;
          setDeviceState((prev) => ({ ...prev, mlagPeerHostname }));
        }
        break;
      }
      case "DIST": {
        const result = await fetchDistInterfaces(hostname, tokenRef.current);
        if (!result) return;
        const { interfaces, tags, portTemplates } = result;
        setInterfacesState((prev) => ({ ...prev, data: interfaces }));
        setFieldOptionsState((prev) => ({
          ...prev,
          tags: mergeTags(prev.tags, tags),
          portTemplates,
        }));
        break;
      }

      default:
        console.error(`Unsupported device type: ${deviceType}`);
        break;
    }
  }, [hostname, deviceType, tokenRef]);

  // --- Convenience actions ---

  const refreshInterfaceStatus = useCallback(() => {
    getInterfaceStatusData();
    getLldpNeighborData();
  }, [getInterfaceStatusData, getLldpNeighborData]);

  const reloadDeviceData = useCallback(() => {
    setDeviceState((prev) => ({ ...prev, thirdPartyUpdate: false }));
    getDeviceSettings();
    getInterfaceData();
    getInterfaceStatusData();
    getLldpNeighborData();
  }, [
    getDeviceSettings,
    getInterfaceData,
    getInterfaceStatusData,
    getLldpNeighborData,
  ]);

  const addTagOption = (_e, data) => {
    const { value } = data;
    setFieldOptionsState((prev) => ({
      ...prev,
      tags: [...prev.tags, { text: value, value }],
    }));
  };

  const addPortTemplateOption = (_e, data) => {
    const { value } = data;
    setFieldOptionsState((prev) => ({
      ...prev,
      portTemplates: [...prev.portTemplates, { text: value, value }],
    }));
  };

  const addNewInterface = (interfaceName) => {
    setInterfacesState((prev) => ({
      ...prev,
      data: [
        ...prev.data,
        { name: interfaceName, ifclass: "custom", tags: null },
      ],
    }));
  };

  const markThirdPartyUpdate = useCallback(() => {
    setDeviceState((prev) => ({ ...prev, thirdPartyUpdate: true }));
  }, []);

  // --- Effects ---

  /** On mount: fetch settings */
  useEffect(() => {
    if (!hostname) return;
    mlagPeerFoundRef.current = false;
    getDeviceSettings();
  }, [hostname, getDeviceSettings]);

  /** After device type is known: fetch interfaces, status, LLDP */
  useEffect(() => {
    if (deviceType) {
      getInterfaceData();
      getInterfaceStatusData();
      getLldpNeighborData();
    }
  }, [
    deviceType,
    getInterfaceData,
    getInterfaceStatusData,
    getLldpNeighborData,
  ]);

  // --- Return ---

  return {
    settings: deviceState.settings,
    interfaces: interfacesState,
    fieldOptions: fieldOptionsState,
    mlagPeerHostname: deviceState.mlagPeerHostname,
    thirdPartyUpdate: deviceState.thirdPartyUpdate,

    // Actions
    refreshInterfaceStatus,
    reloadDeviceData,
    getInterfaceData,
    addTagOption,
    addPortTemplateOption,
    addNewInterface,
    markThirdPartyUpdate,
  };
}

// --- Helpers ---

function mergeTags(existing, incoming) {
  const merged = existing.slice();
  incoming.forEach((tag) => {
    if (!merged.some((e) => e.text === tag.text)) {
      merged.push(tag);
    }
  });
  return merged;
}
