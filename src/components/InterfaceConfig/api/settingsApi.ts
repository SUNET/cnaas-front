import { getData } from "../../../utils/getData";
import type { DropdownOption } from "../stores/interfaceConfigReducer";

export type DeviceSettingsResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  vlans: DropdownOption[];
  untaggedVlans: DropdownOption[];
  tags: { text: string; value: string }[];
};

/**
 * Fetch device settings and derive field options (vlans, tags).
 * Returns { settings, vlans, untaggedVlans, tags }, or null on failure.
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

    const vlans: DropdownOption[] = Object.entries(dataSettings.vxlans).map(
      ([, vxlanData]) => ({
        key: vxlanData.vni,
        value: vxlanData.vlan_name,
        text: vxlanData.vlan_name,
        description: vxlanData.vlan_id,
      }),
    );

    const untaggedVlans: DropdownOption[] = [
      ...vlans,
      { value: null, text: "None", description: "NA" },
    ];

    const interfaceTagOptions = dataSettings.interface_tag_options;
    let tags: { text: string; value: string }[] = [];
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
