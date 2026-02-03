import { Grid, Popup, Divider } from "semantic-ui-react";

function DashboardLinkgrid() {
  const links = [];
  const gitlogo = new URL("../assets/gitlogo.svg", import.meta.url);

  if (process.env.SETTINGS_WEB_URL) {
    links.push({
      title: "Settings Repository",
      description: "View and edit the settings git repository.",
      url: `${process.env.SETTINGS_WEB_URL}`,
      icon: gitlogo,
      backgroundColor: null,
    });
  }

  if (process.env.MONITORING_WEB_URL) {
    links.push({
      title: "Monitoring",
      description: "Network device monitoring (NAV)",
      url: `${process.env.MONITORING_WEB_URL}`,
      icon: new URL("../assets/navlogo.svg", import.meta.url),
      backgroundColor: "#E71324",
    });
  }

  if (process.env.NAC_WEB_URL) {
    links.push({
      title: "Network Access Control",
      description:
        "Network Access Control, MAC authentication bypass (CNaaS-NAC)",
      url: `${process.env.NAC_WEB_URL}`,
      icon: new URL("../assets/freeradiuslogo.svg", import.meta.url),
      backgroundColor: null,
    });
  }

  if (process.env.NETBOX_API_URL) {
    links.push({
      title: "Inventory & IPAM",
      description: "Device inventory and IP address management system (NetBox)",
      url: `${process.env.NETBOX_API_URL}`,
      icon: new URL("../assets/netboxlogo.svg", import.meta.url),
      backgroundColor: null,
    });
  }

  if (process.env.GRAYLOG_WEB_URL) {
    links.push({
      title: "Log Management",
      description: "Search in syslog messages (Graylog)",
      url: `${process.env.GRAYLOG_WEB_URL}`,
      icon: new URL("../assets/grayloglogo.svg", import.meta.url),
      backgroundColor: "#1D2630",
    });
  }

  if (process.env.CLOUDVISION_WEB_URL) {
    links.push({
      title: "Cloud Vision Wireless",
      description: "Access the CloudVision platform for wireless management",
      url: `${process.env.CLOUDVISION_WEB_URL}`,
      icon: new URL("../assets/externallink.svg", import.meta.url),
      backgroundColor: null,
    });
  }

  if (process.env.WIKI_WEB_URL) {
    links.push({
      title: "CNaaS Wiki",
      description: "CNaaS wiki documentation",
      url: `${process.env.WIKI_WEB_URL}`,
      icon: new URL("../assets/externallink.svg", import.meta.url),
      backgroundColor: null,
    });
  }

  links.push(
    {
      title: "API Browser",
      description: "Explore the NMS API endpoints",
      url: "/api/doc/",
      icon: new URL("../assets/swaggerlogo.svg", import.meta.url),
      backgroundColor: null,
    },
    {
      title: "NMS Documentation",
      description: "Official NMS documentation",
      url: "https://cnaas-nms.readthedocs.io/",
      icon: new URL("../assets/readthedocslogo.svg", import.meta.url),
      backgroundColor: null,
    },
  );

  return (
    <>
      <Divider horizontal>Links</Divider>
      <Grid columns={4} stackable>
        {links.map((link) => (
          <Grid.Column key={link.title} textAlign="center">
            <Popup
              content={link.description}
              position="bottom center"
              hoverable
              trigger={
                <a href={link.url} target="_blank" rel="noreferrer">
                  <img
                    src={link.icon}
                    alt={`${link.title} icon`}
                    style={{
                      width: "10em",
                      height: "10em",
                      backgroundColor: link.backgroundColor || "transparent",
                    }}
                  />
                  <div>{link.title}</div>
                </a>
              }
            />
          </Grid.Column>
        ))}
      </Grid>
    </>
  );
}

export default DashboardLinkgrid;
