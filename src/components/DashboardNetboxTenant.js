import { Grid, Popup, Divider, Button } from "semantic-ui-react";
import { useEffect, useState } from "react";
import {
  fetchNetboxTenant,
  fetchNetboxTenantContacts,
} from "../services/netbox";

export function DashboardNetboxTenant() {
  const [netboxTenant, setNetboxTenant] = useState(null);
  const [netboxContacts, setNetboxContacts] = useState(null);
  const [error, setError] = useState(null);

  const getNetboxObjects = async () => {
    if (netboxTenant) return;

    try {
      const tenant = await fetchNetboxTenant();
      if (tenant) {
        setNetboxTenant(tenant);
      }

      const contacts = await fetchNetboxTenantContacts();
      if (contacts.length > 0) {
        setNetboxContacts(contacts);
      }
    } catch (err) {
      console.warn("Failed to load NetBox tenant data:", err);
      setError(err);
    }
  };

  useEffect(() => {
    getNetboxObjects();
  }, []);

  if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) {
    return null;
  }

  if (error) {
    return (
      <>
        <Divider horizontal>NetBox Tenant</Divider>
        <p>Failed to load NetBox tenant data.</p>
      </>
    );
  }

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
                    <Popup
                      trigger={<span>{netboxTenant.group.name}</span>}
                      content={
                        <div>
                          <p>
                            <b>Description:</b>{" "}
                            {netboxTenant.group.description || "N/A"}
                          </p>
                        </div>
                      }
                      position="top left"
                      wide
                      hoverable
                    />
                  ) : (
                    "N/A"
                  )}
                  <br />
                  <b>Sites:</b>{" "}
                  <a
                    href={`${process.env.NETBOX_API_URL}dcim/sites/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                    title="View sites in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.site_count}
                  </a>
                  <br />
                  <b>Devices:</b>{" "}
                  <a
                    href={`${process.env.NETBOX_API_URL}dcim/devices/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                    title="View devices in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.device_count}
                  </a>
                  <br />
                  <b>VRFs:</b>{" "}
                  <a
                    href={`${process.env.NETBOX_API_URL}ipam/vrfs/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                    title="View VRFs in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.vrf_count}
                  </a>
                  <br />
                  <b>Prefixes:</b>{" "}
                  <a
                    href={`${process.env.NETBOX_API_URL}ipam/prefixes/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                    title="View prefixes in NetBox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {netboxTenant.prefix_count}
                  </a>
                  <br />
                  <b>VLANs:</b>{" "}
                  <a
                    href={`${process.env.NETBOX_API_URL}ipam/vlans/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
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
            <p>Loading tenant data...</p>
          )}
        </Grid.Column>
        <Grid.Column>
          <h3>Contacts</h3>
          {netboxContacts?.length > 0 ? (
            netboxContacts.map((contact, index) => (
              <p key={index}>
                {contact.role.name}:{" "}
                <Popup
                  trigger={
                    <span>
                      {contact.contact.name}
                      {contact.priority ? ` (${contact.priority})` : ""}
                    </span>
                  }
                  content={
                    <div>
                      <p>
                        <b>Email:</b> {contact.contact.email || "N/A"}{" "}
                        {contact.contact.email && (
                          <Button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                contact.contact.email,
                              )
                            }
                            icon="copy"
                            size="mini"
                          />
                        )}
                        <br />
                        <b>Phone:</b> {contact.contact.phone || "N/A"}
                      </p>
                    </div>
                  }
                  position="right center"
                  wide
                  hoverable
                />
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
