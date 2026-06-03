import { getData, getDataToken } from "../utils/getData";
import { postData } from "../utils/sendData";

export type NetboxSiteOrLocation = {
  readonly url: string;
  readonly name: string;
};

/**
 * The subset of a Netbox device the frontend actually reads. The Netbox
 * `dcim.devices` payload carries far more; only these fields are consumed
 * (id by interface-config to fetch interfaces, the rest by DeviceInfoTable).
 */
export type NetboxDevice = {
  readonly id: number;
  readonly status: { readonly label: string };
  readonly name?: string;
  readonly display_url?: string;
  readonly site: NetboxSiteOrLocation | null;
  readonly location: NetboxSiteOrLocation | null;
  readonly asset_tag: string | null;
};

type NetboxCredentials = {
  credentials: string | null;
  getFunc: typeof getData | typeof getDataToken;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function toSiteOrLocation(value: unknown): NetboxSiteOrLocation | null {
  if (!isRecord(value)) return null;
  if (typeof value.url !== "string" || typeof value.name !== "string") {
    return null;
  }
  return { url: value.url, name: value.name };
}

/**
 * Validate the loosely-typed Netbox response into a {@link NetboxDevice}.
 * Returns null when the value lacks the required `id`/`status.label`, so the
 * untyped (`any`) API boundary never leaks an unchecked assertion downstream.
 */
export function toNetboxDevice(value: unknown): NetboxDevice | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "number") return null;
  if (!isRecord(value.status) || typeof value.status.label !== "string") {
    return null;
  }
  return {
    id: value.id,
    status: { label: value.status.label },
    name: typeof value.name === "string" ? value.name : undefined,
    display_url:
      typeof value.display_url === "string" ? value.display_url : undefined,
    site: toSiteOrLocation(value.site),
    location: toSiteOrLocation(value.location),
    asset_tag: typeof value.asset_tag === "string" ? value.asset_tag : null,
  };
}

/**
 * The subset of a Netbox device-type (model) the frontend reads. The guard
 * narrows permissively — a missing or wrong-typed field becomes `undefined` —
 * so all fields are optional and {@link toNetboxModel} only rejects non-object
 * values.
 */
export type NetboxModel = {
  readonly display_url?: string;
  readonly front_image?: string;
  readonly description?: string;
  readonly interface_template_count?: number;
};

export function toNetboxModel(value: unknown): NetboxModel | null {
  if (!isRecord(value)) return null;
  return {
    display_url:
      typeof value.display_url === "string" ? value.display_url : undefined,
    front_image:
      typeof value.front_image === "string" ? value.front_image : undefined,
    description:
      typeof value.description === "string" ? value.description : undefined,
    interface_template_count:
      typeof value.interface_template_count === "number"
        ? value.interface_template_count
        : undefined,
  };
}

/**
 * Resolve Netbox API credentials and base URL.
 * Tries netboxToken first (direct Netbox access), falls back to
 * the CNaaS API proxy with the regular JWT token.
 *
 * Returns null if NETBOX_API_URL is not configured.
 */
function resolveNetboxCredentials(
  authToken: string | null,
): NetboxCredentials | null {
  if (!process.env.NETBOX_API_URL) {
    return null;
  }

  const netboxToken = localStorage.getItem("netboxToken");
  if (netboxToken) {
    return {
      credentials: netboxToken,
      getFunc: getDataToken,
      url: process.env.NETBOX_API_URL,
    };
  }

  return {
    credentials: authToken,
    getFunc: getData,
    url: `${process.env.API_URL}/netbox`,
  };
}

/**
 * Fetch a device from Netbox by hostname.
 * Returns the device object, or null if not found or Netbox is not configured.
 */
export async function fetchNetboxDevice(
  hostname: string,
  authToken: string | null,
): Promise<NetboxDevice | null> {
  if (!process.env.NETBOX_TENANT_ID) {
    return null;
  }

  const resolved = resolveNetboxCredentials(authToken);
  if (!resolved) return null;

  const { credentials, getFunc, url } = resolved;
  const requestUrl = `${url}/api/dcim/devices/?name__ie=${hostname}&tenant_id=${process.env.NETBOX_TENANT_ID}`;

  try {
    const data = await getFunc(requestUrl, credentials);

    if (data.count === 1) {
      return toNetboxDevice(data.results[0]);
    }

    console.debug("No Netbox data found for device", hostname);
    return null;
  } catch (error) {
    console.debug(`Netbox request failed: ${requestUrl}`, error);
    return null;
  }
}

/**
 * Fetch interfaces for a Netbox device by device ID.
 * Returns an array of interface objects, or an empty array on failure.
 */
export async function fetchNetboxInterfaces(
  deviceId: number,
  authToken: string | null,
): Promise<Array<Record<string, unknown>>> {
  const resolved = resolveNetboxCredentials(authToken);
  if (!resolved) return [];

  const { credentials, getFunc, url } = resolved;
  const requestUrl = `${url}/api/dcim/interfaces/?device_id=${deviceId}&limit=100`;

  try {
    const data = await getFunc(requestUrl, credentials);
    return data?.results ?? [];
  } catch (error) {
    console.debug(`Netbox request failed: ${requestUrl}`, error);
    return [];
  }
}

/**
 * Fetch a device type/model from Netbox by part number.
 * Returns the model object, or null if not found.
 * Used by DeviceList for model info in expanded rows.
 */
export async function fetchNetboxModel(
  model: string,
  authToken: string | null,
): Promise<NetboxModel | null> {
  const resolved = resolveNetboxCredentials(authToken);
  if (!resolved) return null;

  const { credentials, getFunc, url } = resolved;
  const requestUrl = `${url}/api/dcim/device-types/?part_number__ie=${model}`;

  try {
    const data = await getFunc(requestUrl, credentials);

    if (data.count === 1) {
      return toNetboxModel(data.results[0]);
    }

    console.debug("No Netbox data found for model", model);
    return null;
  } catch (error) {
    console.debug(`Netbox request failed: ${requestUrl}`, error);
    return null;
  }
}

/**
 * Fetch tenant data from Netbox by NETBOX_TENANT_ID.
 * Returns the tenant object, or null if not found or not configured.
 */
export async function fetchNetboxTenant(
  authToken: string | null,
): Promise<Record<string, unknown> | null> {
  if (!process.env.NETBOX_TENANT_ID) return null;

  const resolved = resolveNetboxCredentials(authToken);
  if (!resolved) return null;

  const { credentials, getFunc, url } = resolved;
  const requestUrl = `${url}/api/tenancy/tenants/?id=${process.env.NETBOX_TENANT_ID}`;

  try {
    const data = await getFunc(requestUrl, credentials);

    if (data.results?.length === 1) {
      return data.results[0];
    }

    console.debug(
      "No Netbox tenant found for ID",
      process.env.NETBOX_TENANT_ID,
    );
    return null;
  } catch (error) {
    console.debug(`Netbox request failed: ${requestUrl}`, error);
    return null;
  }
}

/**
 * Fetch contact assignments for the configured tenant via Netbox GraphQL.
 * Returns an array of contact assignments, or an empty array on failure.
 */
export async function fetchNetboxTenantContacts(
  authToken: string | null,
): Promise<Array<Record<string, unknown>>> {
  if (!process.env.NETBOX_TENANT_ID) return [];

  const resolved = resolveNetboxCredentials(authToken);
  if (!resolved) return [];

  const { credentials, url } = resolved;
  const requestUrl = `${url}/graphql/`;
  const query = {
    query: `query {contact_assignment_list(filters:{object_id: ${process.env.NETBOX_TENANT_ID}, object_type: { id: { exact: 110 }}}) {contact {name email phone} role {name} priority}}`,
  };

  try {
    const data = await postData(requestUrl, credentials, query);
    return data.data?.contact_assignment_list ?? [];
  } catch (error) {
    console.debug(`Netbox request failed: ${requestUrl}`, error);
    return [];
  }
}

/**
 * Fetch physical interfaces tagged for the dashboard from Netbox.
 * Returns an array of interface objects, or an empty array on failure.
 */
export async function fetchNetboxDashboardInterfaces(
  authToken: string | null,
): Promise<Array<Record<string, unknown>>> {
  if (!process.env.NETBOX_TENANT_ID) return [];

  const resolved = resolveNetboxCredentials(authToken);
  if (!resolved) return [];

  const { credentials, getFunc, url } = resolved;
  const data = await getFunc(
    `${url}/api/dcim/interfaces/?tenant_id=${process.env.NETBOX_TENANT_ID}&kind=physical&tag=cnaas_dashboard&limit=20`,
    credentials,
  );
  return data?.results ?? [];
}
