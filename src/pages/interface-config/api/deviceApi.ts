import { getData, getDataHeaders } from "../../../utils/getData";
import { putData, postData } from "../../../utils/sendData";
import { extractErrorMessage } from "../../../utils/extractErrorMessage";
import type {
  AccessInterfaceData,
  AccessInterfaceItem,
  DistInterfaceItem,
} from "../types/interfaces";
import type { LldpNeighbor } from "../types/lldp";
import type { PortTemplate } from "../types/portTemplate";

// --- Response helpers ---

type ApiResult = {
  readonly status?: string;
  readonly message?: string;
  readonly data?: unknown;
};

function isApiResult(x: unknown): x is ApiResult {
  return typeof x === "object" && x !== null;
}

// --- Result types ---

export type SaveInterfacesResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type StartAutoPushResult = { readonly jobId: number };

export type BounceInterfaceResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type AccessInterfacesResult = {
  interfaces: AccessInterfaceItem[];
  tags: string[];
  mlagPeerHostname: string | null;
};

export type DistInterfacesResult = {
  interfaces: DistInterfaceItem[];
  tags: string[];
  portTemplates: PortTemplate[];
};

// --- Device lookups ---

/** Fetch a single device by numeric ID. Returns the device object, or null on failure. */
export async function fetchDeviceById(
  deviceId: number,
  token: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${deviceId}`;
    const resp = (await getData(url, token)) as {
      data: { devices: unknown[] };
    };
    return resp.data.devices[0] ?? null;
  } catch (error) {
    console.error(`Failed to fetch device ${deviceId}:`, error);
    return null;
  }
}

// --- Interface readers ---

export async function fetchLldpNeighbors(
  hostname: string,
  token: string | null,
): Promise<Record<string, LldpNeighbor[]>> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/lldp_neighbors_detail`;
    const data = (await getData(url, token)) as {
      data: { lldp_neighbors_detail?: Record<string, LldpNeighbor[]> };
    };
    const raw = data.data.lldp_neighbors_detail ?? {};
    const lldpNeighbors: Record<string, LldpNeighbor[]> = {};
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

export async function fetchAccessInterfaces(
  hostname: string,
  token: string | null,
): Promise<AccessInterfacesResult | null> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
    const resp = (await getData(url, token)) as {
      data: { interfaces?: AccessInterfaceItem[] };
    };
    const interfaces = resp.data.interfaces ?? [];

    const tags: string[] = [];
    interfaces.forEach((item) => {
      const ifData = item.data;
      if (ifData !== null && "tags" in ifData && ifData.tags) {
        ifData.tags.forEach((tag) => {
          if (!tags.includes(tag)) tags.push(tag);
        });
      }
    });

    let mlagPeerHostname: string | null = null;
    for (const item of interfaces) {
      const ifData = item.data as AccessInterfaceData | null;
      if (ifData !== null && "neighbor_id" in ifData && ifData.neighbor_id) {
        try {
          const mlagDevURL = `${process.env.API_URL}/api/v1.0/device/${ifData.neighbor_id}`;
          const mlagData = (await getData(mlagDevURL, token)) as {
            data: { devices: { hostname: string }[] };
          };
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

export async function fetchDistInterfaces(
  hostname: string,
  token: string | null,
): Promise<DistInterfacesResult | null> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/generate_config`;
    const data = (await getDataHeaders(url, token, {
      "X-Fields": "available_variables{interfaces,port_template_options}",
    })) as {
      data: {
        config: {
          available_variables: {
            interfaces: DistInterfaceItem[];
            port_template_options?: Record<
              string,
              {
                description?: string;
                vlan_config?: unknown;
              }
            >;
          };
        };
      };
    };
    const fetchedAvailableVariables = data.data.config.available_variables;

    const availablePortTemplateOptions =
      fetchedAvailableVariables.port_template_options;
    const usedPortTemplates: PortTemplate[] = Object.entries(
      availablePortTemplateOptions ?? {},
    ).map(([templateName, templateData]) => ({
      name: templateName,
      description: templateData.description,
      vlanConfig: templateData.vlan_config,
    }));

    const interfaces = fetchedAvailableVariables.interfaces;

    const allPortTemplates: PortTemplate[] = [...usedPortTemplates];
    interfaces.forEach((item) => {
      if (item.ifclass.startsWith("port_template")) {
        const templateName = item.ifclass.substring("port_template_".length);
        if (!allPortTemplates.some((e) => e.name === templateName)) {
          allPortTemplates.push({ name: templateName });
        }
      }
    });

    const tags: string[] = [];
    interfaces.forEach((item) => {
      if (tags.length === 0 && item.tags) {
        item.tags.forEach((tag) => {
          if (!tags.includes(tag)) tags.push(tag);
        });
      }
    });

    return { interfaces, tags, portTemplates: allPortTemplates };
  } catch (error) {
    console.log(error);
    return null;
  }
}

// --- Interface CRUD ---

export async function saveInterfaces(
  hostname: string,
  body: unknown,
  token: string | null,
): Promise<SaveInterfacesResult> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
    const data: unknown = await putData(url, token, body);
    if (!isApiResult(data)) {
      return { success: false, error: "Unexpected response shape" };
    }
    if (data.status === "success") return { success: true };
    return { success: false, error: data.message ?? "Unknown error" };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error) };
  }
}

/** Import interfaces from a JSON file. Same endpoint as saveInterfaces but separate caller. */
export const importInterfaces = saveInterfaces;

export async function fetchRunningConfig(
  hostname: string,
  interfaceName: string,
  token: string | null,
): Promise<string | null> {
  const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/running_config?interface=${interfaceName}`;
  const resp: unknown = await getData(url, token);
  if (
    isApiResult(resp) &&
    typeof resp.data === "object" &&
    resp.data !== null &&
    "config" in resp.data &&
    typeof (resp.data as { config: unknown }).config === "string"
  ) {
    return (resp.data as { config: string }).config;
  }
  return null;
}

// --- Sync / push ---

export async function startAutoPush(
  hostname: string | null,
  token: string | null,
): Promise<StartAutoPushResult> {
  // TODO: device_syncto is also called from ConfigChange/api/configChangeApi.ts; consider promoting to src/api/ if a third caller appears.
  const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
  const body = {
    dry_run: true,
    comment: "interface update via WebUI",
    hostname,
    auto_push: true,
  };
  const data: unknown = await postData(url, token, body);
  if (
    isApiResult(data) &&
    typeof (data as { job_id?: unknown }).job_id === "number"
  ) {
    return { jobId: (data as { job_id: number }).job_id };
  }
  throw new Error("Missing job_id in autopush response");
}

// --- Interface actions ---

export async function bounceInterface(
  hostname: string | null,
  interfaceName: string,
  token: string | null,
): Promise<BounceInterfaceResult> {
  try {
    const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
    const body = { bounce_interfaces: [interfaceName] };
    const data: unknown = await putData(url, token, body);
    if (isApiResult(data) && data.status === "success") {
      return { success: true };
    }
    const errorBody = isApiResult(data) ? String(data.data) : "Unknown error";
    return { success: false, error: errorBody };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error) };
  }
}

// --- Export (blob download) ---

export async function exportInterfaces(
  hostname: string,
  token: string | null,
): Promise<Blob> {
  const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces_export`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.blob();
}
