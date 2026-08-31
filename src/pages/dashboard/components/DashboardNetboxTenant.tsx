import { useEffect, useState } from "react";
import { Grid, Divider } from "semantic-ui-react";
import { Tooltip } from "../../../components/Tooltip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import {
  fetchNetboxTenant,
  fetchNetboxTenantContacts,
} from "../../../api/netboxApi";
import {
  toNetboxTenant,
  toNetboxContact,
  type NetboxTenant,
  type NetboxContact,
} from "../types/netbox";

export function DashboardNetboxTenant() {
  const { token } = useAuthToken();
  const [netboxTenant, setNetboxTenant] = useState<NetboxTenant | null>(null);
  const [netboxContacts, setNetboxContacts] = useState<NetboxContact[]>([]);
  const [loading, setLoading] = useState(true);

  const getNetboxObjects = async () => {
    if (netboxTenant) return;
    if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) return;

    try {
      const tenant = toNetboxTenant(await fetchNetboxTenant(token));
      if (tenant) setNetboxTenant(tenant);

      const rawContacts = await fetchNetboxTenantContacts(token);
      const contacts = rawContacts.flatMap((c) => {
        const parsed = toNetboxContact(c);
        return parsed ? [parsed] : [];
      });
      if (contacts.length > 0) setNetboxContacts(contacts);
    } catch (error) {
      console.error("Failed to load NetBox tenant data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Legitimate one-time initial fetch into component state on mount.
    getNetboxObjects();
  }, []);

  if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) {
    return null;
  }

  const tenantBaseUrl = process.env.NETBOX_API_URL;
  const tenantId = process.env.NETBOX_TENANT_ID;

  return (
    <>
      <Divider horizontal>NetBox Tenant</Divider>
      <Grid columns={2} stackable>
        <Grid.Column>
          {netboxTenant ? (
            <>
              <h3>
                {netboxTenant.name} ({netboxTenant.description})
              </h3>
              <div>
                <p>
                  <b>Customer status:</b>{" "}
                  {netboxTenant.group?.name ? (
                    <Tooltip
                      title={
                        <div>
                          <p>
                            <b>Description:</b>{" "}
                            {netboxTenant.group.description || "N/A"}
                          </p>
                        </div>
                      }
                      placement="top-start"
                    >
                      <span>{netboxTenant.group.name}</span>
                    </Tooltip>
                  ) : (
                    "N/A"
                  )}
                  <br />
                  <b>Sites:</b>{" "}
                  <a
                    href={`${tenantBaseUrl}dcim/sites/?tenant_id=${tenantId}`}
                    title="View sites in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.site_count}
                  </a>
                  <br />
                  <b>Devices:</b>{" "}
                  <a
                    href={`${tenantBaseUrl}dcim/devices/?tenant_id=${tenantId}`}
                    title="View devices in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.device_count}
                  </a>
                  <br />
                  <b>VRFs:</b>{" "}
                  <a
                    href={`${tenantBaseUrl}ipam/vrfs/?tenant_id=${tenantId}`}
                    title="View VRFs in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.vrf_count}
                  </a>
                  <br />
                  <b>Prefixes:</b>{" "}
                  <a
                    href={`${tenantBaseUrl}ipam/prefixes/?tenant_id=${tenantId}`}
                    title="View prefixes in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.prefix_count}
                  </a>
                  <br />
                  <b>VLANs:</b>{" "}
                  <a
                    href={`${tenantBaseUrl}ipam/vlans/?tenant_id=${tenantId}`}
                    title="View VLANs in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.vlan_count}
                  </a>
                </p>
              </div>
            </>
          ) : (
            <p>
              {loading ? (
                <>
                  <CircularProgress size="1em" />
                  {" Loading tenant data..."}
                </>
              ) : (
                "No tenant data found."
              )}
            </p>
          )}
        </Grid.Column>
        <Grid.Column>
          <h3>Contacts</h3>
          {netboxContacts.length > 0 ? (
            netboxContacts.map((contact) => (
              <p key={`${contact.role.name}:${contact.contact.name}`}>
                {contact.role.name}:{" "}
                <Tooltip
                  title={
                    <div>
                      <p>
                        <b>Email:</b> {contact.contact.email || "N/A"}{" "}
                        {contact.contact.email && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                contact.contact.email ?? "",
                              )
                            }
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        )}
                        <br />
                        <b>Phone:</b> {contact.contact.phone || "N/A"}
                      </p>
                    </div>
                  }
                  placement="right"
                >
                  <span>
                    {contact.contact.name}
                    {contact.priority ? ` (${contact.priority})` : ""}
                  </span>
                </Tooltip>
              </p>
            ))
          ) : (
            <p>No contacts found.</p>
          )}
        </Grid.Column>
      </Grid>
    </>
  );
}
