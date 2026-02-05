import { Grid, Popup, Divider, Button } from "semantic-ui-react";
import { getData, getDataToken } from "../utils/getData";
import { useEffect, useState } from "react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { postData } from "../utils/sendData";

function DashboardNetboxTenant() {
  const { token } = useAuthToken();

  const [netboxTenant, setNetboxTenant] = useState(null);
  const [netboxContacts, setNetboxContacts] = useState(null);

  const getNetboxObjects = async () => {
    if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) {
      return null;
    }

    let credentials = localStorage.getItem("netboxToken");
    let getFunc = getDataToken;
    let url = process.env.NETBOX_API_URL;
    // fallback
    if (!credentials) {
      credentials = token;
      getFunc = getData;
      url = `${process.env.API_URL}/netbox`;
    }

    if (netboxTenant === null) {
      setNetboxTenant(false); // Initialize as empty array to avoid repeated calls
      try {
        const tenantUrl = `${url}/api/tenancy/tenants/?id=${process.env.NETBOX_TENANT_ID}`;
        const tenantData = await getFunc(tenantUrl, credentials);
        if (tenantData.results?.length === 1) {
          setNetboxTenant(tenantData.results[0]);
        }

        const contactsUrl = `${url}/graphql/`;
        const contactsQuery = {
          query: `query {contact_assignment_list(filters:{object_id: ${process.env.NETBOX_TENANT_ID}, object_type: { id: { exact: 110 }}}) {contact {name email phone} role {name} priority}}`,
        };
        const contactsData = await postData(
          contactsUrl,
          credentials,
          contactsQuery,
        );
        if (contactsData.data?.contact_assignment_list) {
          setNetboxContacts(contactsData.data.contact_assignment_list);
        }
        console.log("contactsData", contactsData);
      } catch (error) {
        console.warn("Failed to load NetBox tenant data:", error);
      }
    }
  };

  useEffect(() => {
    getNetboxObjects();
  }, []);

  return (
    <>
      <Divider horizontal>NetBox Tenant</Divider>
      <Grid columns={2} stackable>
        <Grid.Column>
          {netboxTenant && (
            <h3>
              {netboxTenant.name} ({netboxTenant.description})
            </h3>
          )}
          {netboxTenant ? (
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
                  href={`${process.env.NETBOX_API_URL}/dcim/sites/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                  title="View sites in NetBox"
                  target="_blank"
                >
                  {netboxTenant.site_count}
                </a>
                <br />
                <b>Devices:</b>{" "}
                <a
                  href={`${process.env.NETBOX_API_URL}/dcim/devices/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                  title="View devices in NetBox"
                  target="_blank"
                >
                  {netboxTenant.device_count}
                </a>
                <br />
                <b>VRFs:</b>{" "}
                <a
                  href={`${process.env.NETBOX_API_URL}/ipam/vrfs/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                  title="View VRFs in NetBox"
                  target="_blank"
                >
                  {netboxTenant.vrf_count}
                </a>
                <br />
                <b>Prefixes:</b>{" "}
                <a
                  href={`${process.env.NETBOX_API_URL}/ipam/prefixes/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                  title="View prefixes in NetBox"
                  target="_blank"
                >
                  {netboxTenant.prefix_count}
                </a>
                <br />
                <b>VLANs:</b>{" "}
                <a
                  href={`${process.env.NETBOX_API_URL}/ipam/vlans/?tenant_id=${process.env.NETBOX_TENANT_ID}`}
                  title="View VLANs in NetBox"
                  target="_blank"
                >
                  {netboxTenant.vlan_count}
                </a>
              </p>
            </div>
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

export default DashboardNetboxTenant;
