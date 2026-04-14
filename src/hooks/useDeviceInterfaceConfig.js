import { useCallback, useEffect, useState } from "react";
import { getData, getDataHeaders } from "../utils/getData";
import { useAuthToken } from "../contexts/AuthTokenContext";

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

  // --- Fetch functions ---

  const getDeviceSettings = useCallback(async () => {
    const settingsUrl = `${process.env.API_URL}/api/v1.0/settings?hostname=${hostname}`;
    try {
      const dataSettings = (await getData(settingsUrl, token)).data.settings;

      const vlans = Object.entries(dataSettings.vxlans).map(
        ([, vxlanData]) => ({
          key: vxlanData.vni,
          value: vxlanData.vlan_name,
          text: vxlanData.vlan_name,
          description: vxlanData.vlan_id,
        }),
      );

      const untaggedVlans = [
        ...vlans,
        { value: null, text: "None", description: "NA" },
      ];

      const interfaceTagOptions = dataSettings.interface_tag_options;
      let tags = [];
      if (interfaceTagOptions) {
        tags =
          Object.entries(interfaceTagOptions).map(([tagName]) => ({
            text: tagName,
            value: tagName,
          })) ?? [];
      }

      setDeviceState((prev) => ({ ...prev, settings: dataSettings }));
      setFieldOptionsState((prev) => ({ ...prev, vlans, untaggedVlans, tags }));
    } catch (error) {
      console.log(error);
    }
  }, [hostname, token]);

  const getInterfaceStatusData = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
      const data = await getData(url, token);
      setInterfacesState((prev) => ({
        ...prev,
        status: data.data.interface_status,
      }));
    } catch (error) {
      console.log(error);
      setInterfacesState((prev) => ({ ...prev, status: {} }));
    }
  }, [hostname, token]);

  const getLldpNeighborData = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/lldp_neighbors_detail`;
      const data = await getData(url, token);
      const fetchedLldpNeighsDetail = data.data.lldp_neighbors_detail;
      const lldpNeighbors = {};
      // save keys as lowercase, in case yaml interface name is not correct case
      Object.keys(fetchedLldpNeighsDetail ?? []).forEach((key) => {
        lldpNeighbors[key.toLowerCase()] = fetchedLldpNeighsDetail[key];
      });
      setInterfacesState((prev) => ({ ...prev, lldpNeighbors }));
    } catch (error) {
      console.log(error);
      setInterfacesState((prev) => ({ ...prev, lldpNeighbors: {} }));
    }
  }, [hostname, token]);

  const getInterfaceDataAccess = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
      const fetchedInterfaces =
        (await getData(url, token)).data.interfaces ?? [];
      setInterfacesState((prev) => ({ ...prev, data: fetchedInterfaces }));

      setFieldOptionsState((prev) => {
        const usedTags = prev.tags.slice();
        fetchedInterfaces.forEach((item) => {
          const ifData = item.data;
          if (ifData !== null && "tags" in ifData) {
            ifData.tags.forEach((tag) => {
              if (usedTags.some((e) => e.text === tag)) {
                return; // don't add duplicate tags
              }
              usedTags.push({ text: tag, value: tag });
            });
          }
        });
        return { ...prev, tags: usedTags };
      });

      for (const item of fetchedInterfaces) {
        const ifData = item.data;
        if (
          ifData !== null &&
          "neighbor_id" in ifData &&
          !deviceState.mlagPeerHostname
        ) {
          try {
            const mlagDevURL = `${process.env.API_URL}/api/v1.0/device/${ifData.neighbor_id}`;
            const mlagData = await getData(mlagDevURL, token);
            setDeviceState((prev) => ({
              ...prev,
              mlagPeerHostname: mlagData.data.devices[0].hostname,
            }));
            break;
          } catch (error) {
            console.log(`MLAG peer not found: ${error}`);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  }, [hostname, token, deviceState.mlagPeerHostname]);

  const getInterfaceDataDist = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/generate_config`;
      const data = await getDataHeaders(url, token, {
        "X-Fields": "available_variables{interfaces,port_template_options}",
      });
      const fetchedAvailableVariables = data.data.config.available_variables;

      const availablePortTemplateOptions =
        fetchedAvailableVariables.port_template_options;
      const usedPortTemplates = Object.entries(
        availablePortTemplateOptions ?? {},
      ).map(([templateName, templateData]) => ({
        text: templateName,
        value: templateName,
        description: templateData.description,
        vlan_config: templateData.vlan_config,
      }));

      const availableInterfaces = fetchedAvailableVariables.interfaces;
      setInterfacesState((prev) => ({ ...prev, data: availableInterfaces }));

      const allPortTemplates = [...usedPortTemplates];
      availableInterfaces.forEach((item) => {
        if (item.ifclass.startsWith("port_template")) {
          const templateName = item.ifclass.substring("port_template_".length);
          if (!allPortTemplates.some((e) => e.text === templateName)) {
            allPortTemplates.push({
              text: templateName,
              value: templateName,
            });
          }
        }
      });

      setFieldOptionsState((prev) => {
        const usedTags = prev.tags.slice();
        availableInterfaces.forEach((item) => {
          if (usedTags.length === 0 && item.tags) {
            item.tags.forEach((tag) => {
              if (!usedTags.some((e) => e.text === tag)) {
                usedTags.push({ text: tag, value: tag });
              }
            });
          }
        });
        return { ...prev, tags: usedTags, portTemplates: allPortTemplates };
      });
    } catch (error) {
      console.log(error);
    }
  }, [hostname, token]);

  const getInterfaceData = useCallback(async () => {
    if (deviceType === "ACCESS") {
      await getInterfaceDataAccess();
    } else if (deviceType === "DIST") {
      await getInterfaceDataDist();
    }

    if (deviceType && deviceType !== "ACCESS" && deviceType !== "DIST") {
      console.error(`Unsupported device type: ${deviceType}`);
    }
  }, [deviceType, getInterfaceDataAccess, getInterfaceDataDist]);

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

  const clearThirdPartyUpdate = useCallback(() => {
    setDeviceState((prev) => ({ ...prev, thirdPartyUpdate: false }));
  }, []);

  // --- Effects ---

  /** On mount: fetch settings */
  useEffect(() => {
    if (!hostname) return;
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
    getDeviceSettings,
    addTagOption,
    addPortTemplateOption,
    addNewInterface,
    markThirdPartyUpdate,
    clearThirdPartyUpdate,
  };
}
