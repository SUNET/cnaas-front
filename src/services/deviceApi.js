import { getData, getDataHeaders } from "../utils/getData";

/**
 * Fetch a single device by hostname.
 * Returns the device object, or null on failure.
 */
export async function fetchDevice(hostname, token) {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}`;
    const device = (await getData(url, token)).data.devices[0];
    return device ?? null;
  } catch (error) {
    console.error(`Failed to fetch device ${hostname}:`, error);
    return null;
  }
}

/**
 * Fetch device settings and derive field options (vlans, tags).
 * Returns { settings, vlans, untaggedVlans, tags }, or null on failure.
 */
export async function fetchDeviceSettings(hostname, token) {
  try {
    const url = `${process.env.API_URL}/api/v1.0/settings?hostname=${hostname}`;
    const dataSettings = (await getData(url, token)).data.settings;

    const vlans = Object.entries(dataSettings.vxlans).map(([, vxlanData]) => ({
      key: vxlanData.vni,
      value: vxlanData.vlan_name,
      text: vxlanData.vlan_name,
      description: vxlanData.vlan_id,
    }));

    const untaggedVlans = [
      ...vlans,
      { value: null, text: "None", description: "NA" },
    ];

    const interfaceTagOptions = dataSettings.interface_tag_options;
    let tags = [];
    if (interfaceTagOptions) {
      tags = Object.entries(interfaceTagOptions).map(([tagName]) => ({
        text: tagName,
        value: tagName,
      }));
    }

    return { settings: dataSettings, vlans, untaggedVlans, tags };
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Fetch interface status for a device.
 * Returns the interface_status object, or empty object on failure.
 */
export async function fetchInterfaceStatus(hostname, token) {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
    const data = await getData(url, token);
    return data.data.interface_status;
  } catch (error) {
    console.log(error);
    return {};
  }
}

/**
 * Fetch LLDP neighbor details for a device.
 * Returns an object keyed by lowercase interface name, or empty object on failure.
 */
export async function fetchLldpNeighbors(hostname, token) {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/lldp_neighbors_detail`;
    const data = await getData(url, token);
    const raw = data.data.lldp_neighbors_detail ?? {};
    const lldpNeighbors = {};
    // save keys as lowercase, in case yaml interface name is not correct case
    Object.keys(raw).forEach((key) => {
      lldpNeighbors[key.toLowerCase()] = raw[key];
    });
    return lldpNeighbors;
  } catch (error) {
    console.log(error);
    return {};
  }
}

/**
 * Fetch interfaces for an ACCESS device.
 * Also looks up the MLAG peer hostname if any interface has a neighbor_id.
 * Returns { interfaces, tags, mlagPeerHostname }, or null on failure.
 */
export async function fetchAccessInterfaces(hostname, token) {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
    const interfaces = (await getData(url, token)).data.interfaces ?? [];

    const tags = [];
    interfaces.forEach((item) => {
      const ifData = item.data;
      if (ifData !== null && "tags" in ifData) {
        ifData.tags.forEach((tag) => {
          if (!tags.some((e) => e.text === tag)) {
            tags.push({ text: tag, value: tag });
          }
        });
      }
    });

    let mlagPeerHostname = null;
    for (const item of interfaces) {
      const ifData = item.data;
      if (ifData !== null && "neighbor_id" in ifData) {
        try {
          const mlagDevURL = `${process.env.API_URL}/api/v1.0/device/${ifData.neighbor_id}`;
          const mlagData = await getData(mlagDevURL, token);
          mlagPeerHostname = mlagData.data.devices[0].hostname;
          break;
        } catch (error) {
          console.log(`MLAG peer not found: ${error}`);
        }
      }
    }

    return { interfaces, tags, mlagPeerHostname };
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Fetch interfaces for a DIST device via generate_config.
 * Returns { interfaces, tags, portTemplates }, or null on failure.
 */
export async function fetchDistInterfaces(hostname, token) {
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

    const interfaces = fetchedAvailableVariables.interfaces;

    const allPortTemplates = [...usedPortTemplates];
    interfaces.forEach((item) => {
      if (item.ifclass.startsWith("port_template")) {
        const templateName = item.ifclass.substring("port_template_".length);
        if (!allPortTemplates.some((e) => e.text === templateName)) {
          allPortTemplates.push({ text: templateName, value: templateName });
        }
      }
    });

    const tags = [];
    interfaces.forEach((item) => {
      if (tags.length === 0 && item.tags) {
        item.tags.forEach((tag) => {
          if (!tags.some((e) => e.text === tag)) {
            tags.push({ text: tag, value: tag });
          }
        });
      }
    });

    return { interfaces, tags, portTemplates: allPortTemplates };
  } catch (error) {
    console.log(error);
    return null;
  }
}
