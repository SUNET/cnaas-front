import { getData } from "../../../utils/getData";
import type { Vlan } from "../types/vlan";

export type DeviceSettingsResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  vlans: Vlan[];
  tags: string[];
};

/**
 * Fetch device settings and derive VLAN/tag domain entities.
 * Returns { settings, vlans, tags }, or null on failure.
 */
export async function fetchDeviceSettings(
  hostname: string,
  token: string | null,
): Promise<DeviceSettingsResult | null> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/settings?hostname=${hostname}`;
    const resp = (await getData(url, token)) as {
      data: {
        settings: {
          vxlans: Record<
            string,
            { vni: number; vlan_name: string; vlan_id: number }
          >;
          interface_tag_options?: Record<string, unknown>;
        };
      };
    };
    const dataSettings = resp.data.settings;

    const vlans: Vlan[] = Object.entries(dataSettings.vxlans).map(
      ([, vxlanData]) => ({
        vni: vxlanData.vni,
        name: vxlanData.vlan_name,
        id: vxlanData.vlan_id,
      }),
    );

    const interfaceTagOptions = dataSettings.interface_tag_options;
    const tags: string[] = interfaceTagOptions
      ? Object.keys(interfaceTagOptions)
      : [];

    return { settings: dataSettings, vlans, tags };
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Fetch BGP VRF settings for a device.
 * Returns the extroute_bgp.vrfs array, or empty array on failure.
 */
export async function fetchBgpSettings(
  hostname: string,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/settings?hostname=${hostname}`;
    const resp = (await getData(url, token)) as {
      data: {
        settings: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          extroute_bgp?: { vrfs?: any[] };
        };
      };
    };
    return resp.data.settings.extroute_bgp?.vrfs ?? [];
  } catch (error) {
    console.error("Failed to fetch BGP settings:", error);
    return [];
  }
}
