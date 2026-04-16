import { getData, getDataToken } from "../utils/getData";
import { postData } from "../utils/sendData";

/**
 * Resolve Netbox API credentials and base URL.
 * Tries netboxToken first (direct Netbox access), falls back to
 * the CNaaS API proxy with the regular JWT token.
 *
 * Returns null if NETBOX_API_URL is not configured.
 */
function resolveNetboxCredentials(token) {
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
    credentials: token,
    getFunc: getData,
    url: `${process.env.API_URL}/netbox`,
  };
}

/**
 * Fetch a device from Netbox by hostname.
 * Returns the device object, or null if not found or Netbox is not configured.
 */
export async function fetchNetboxDevice(hostname, token) {
  if (!process.env.NETBOX_TENANT_ID) {
    return null;
  }

  const resolved = resolveNetboxCredentials(token);
  if (!resolved) return null;

  const { credentials, getFunc, url } = resolved;
  const requestUrl = `${url}/api/dcim/devices/?name__ie=${hostname}&tenant_id=${process.env.NETBOX_TENANT_ID}`;

  try {
    const data = await getFunc(requestUrl, credentials);

    if (data.count === 1) {
      return data.results[0];
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
export async function fetchNetboxInterfaces(deviceId, token) {
  const resolved = resolveNetboxCredentials(token);
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
export async function fetchNetboxModel(model, token) {
  const resolved = resolveNetboxCredentials(token);
  if (!resolved) return null;

  const { credentials, getFunc, url } = resolved;
  const requestUrl = `${url}/api/dcim/device-types/?part_number__ie=${model}`;

  try {
    const data = await getFunc(requestUrl, credentials);

    if (data.count === 1) {
      return data.results[0];
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
export async function fetchNetboxTenant(token) {
  if (!process.env.NETBOX_TENANT_ID) return null;

  const resolved = resolveNetboxCredentials(token);
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
export async function fetchNetboxTenantContacts(token) {
  if (!process.env.NETBOX_TENANT_ID) return [];

  const resolved = resolveNetboxCredentials(token);
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
export async function fetchNetboxDashboardInterfaces(token) {
  if (!process.env.NETBOX_TENANT_ID) return [];

  const resolved = resolveNetboxCredentials(token);
  if (!resolved) return [];

  const { credentials, getFunc, url } = resolved;
  const data = await getFunc(
    `${url}/api/dcim/interfaces/?tenant_id=${process.env.NETBOX_TENANT_ID}&kind=physical&tag=cnaas_dashboard&limit=20`,
    credentials,
  );
  return data?.results ?? [];
}
